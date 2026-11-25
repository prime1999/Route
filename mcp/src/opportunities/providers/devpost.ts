/**
 * Devpost opportunity provider.
 *
 * Responsibilities:
 * 1. Discover hackathons through Devpost's public API.
 * 2. Retrieve a specific hackathon by URL.
 * 3. Normalize Devpost data into ROUTE's Opportunity model.
 * 4. Extract structured preparation facts from retrieved pages.
 * 5. Discover and retrieve relevant pages linked from a hackathon.
 * 6. Preserve each successfully retrieved page as separate source content.
 *
 * Architectural boundary:
 * ROUTE retrieves and organizes source-backed opportunity information.
 * It does not summarize with an LLM, generate project ideas, determine
 * personalized eligibility, write applications, or submit entries.
 */

import * as cheerio from "cheerio";
import type { Opportunity, OpportunityType } from "../types.js";

import type {
  OpportunityPreparationContext,
  PreparationEligibility,
  PreparationRequirement,
  PreparationSourceContent,
} from "../preparation/types.js";

import type {
  OpportunityProvider,
  OpportunityProviderResult,
  OpportunitySearchParams,
} from "./types.js";

/** Devpost's public hackathon discovery endpoint. */
const DEVPOST_API_URL = "https://devpost.com/api/hackathons";

/** Maximum number of results returned from one Devpost page. */
const DEFAULT_PAGE_SIZE = 9;

/** Prevent unbounded API pagination during keyword searches. */
const MAX_PAGES_PER_SEARCH = 10;

/**
 * Bound preparation retrieval so a page with many links cannot trigger
 * unlimited network requests.
 *
 * This is the maximum number of pages requested, including the overview
 * page and any requests that fail. Failed requests count against the
 * limit so an unreliable site cannot cause more requests than this.
 */
const MAX_PREPARATION_PAGES = 12;

/** Retrieve at most three discovered pages concurrently. */
const PREPARATION_FETCH_CONCURRENCY = 3;

/**
 * Maximum time to wait for one linked page.
 *
 * Without a limit, one unresponsive page would stall its whole batch,
 * and therefore the entire preparation request, even though the overview
 * has already been retrieved.
 */
const PREPARATION_PAGE_TIMEOUT_MS = 10_000;

/**
 * These words help identify links likely to contain useful opportunity
 * preparation information.
 *
 * Both visible link text and URL paths are checked. We do not construct
 * Devpost subpage URLs or assume a particular URL structure.
 */
const RELEVANT_PAGE_LINK_PATTERN =
  /\b(rules?|resources?|faqs?|frequently asked questions?|schedule|dates?|updates?|tracks?|prizes?|awards?|judging|judges?|criteria|submission|submissions|eligibility|requirements?|challenge|tips?)\b/i;

/**
 * Paths that must never be crawled, even when their link text or path
 * looks relevant.
 *
 * These pages require an account, change state, or manage a person's own
 * submission instead of describing the opportunity. A path is excluded
 * only when a whole path segment matches, so a page such as
 * /updates/46538-strong-submission-tips is not affected.
 */
const EXCLUDED_PAGE_PATH_PATTERN =
  /(^|\/)(login|logout|sign[-_]?in|sign[-_]?up|register|users?|accounts?|oauth|settings|submit-to|manage)(\/|$)/i;

interface DevpostHackathon {
  title?: unknown;
  displayed_location?: unknown;
  open_state?: unknown;
  time_left_to_submission?: unknown;
  submission_period_dates?: unknown;
  prize_amount?: unknown;
  registrations_count?: unknown;
  themes?: unknown;
  url?: unknown;
}

interface DevpostApiResponse {
  hackathons?: unknown;
}

interface RetrievedPage {
  url: string;
  title: string;
  html: string;
}

/**
 * Convert an unknown value to a normalized, non-empty string.
 */
function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized || undefined;
}

/**
 * Normalize a Devpost URL.
 *
 * Remove fragments and unnecessary trailing slashes to reduce duplicate
 * URL variants. The caller is responsible for validating the hostname.
 */
function normalizeUrl(url: string): string {
  const parsed = new URL(url);

  parsed.protocol = "https:";
  parsed.hash = "";

  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

/**
 * Extract readable text from HTML.
 *
 * This helper is used as a fallback when a page does not expose a known
 * content container.
 */
function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, iframe, noscript, svg").remove();

  return $("body")
    .text()
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Check whether a value resembles an object from the Devpost API.
 */
function isDevpostHackathon(value: unknown): value is DevpostHackathon {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.title === "string" || typeof candidate.url === "string"
  );
}

/**
 * Normalize a Devpost API item into ROUTE's shared Opportunity model.
 */
function normalizeHackathon(hackathon: DevpostHackathon): Opportunity | null {
  const title = asString(hackathon.title);
  const rawUrl = asString(hackathon.url);

  if (!title || !rawUrl) {
    return null;
  }

  let url: string;

  try {
    url = normalizeUrl(rawUrl);
  } catch {
    return null;
  }

  const location = asString(hackathon.displayed_location) ?? "online";
  const prize = asString(hackathon.prize_amount);

  const themes = Array.isArray(hackathon.themes)
    ? hackathon.themes
        .filter((theme): theme is string => typeof theme === "string")
        .map((theme) => theme.trim())
        .filter(Boolean)
    : [];

  const openState = asString(hackathon.open_state);
  const timeLeft = asString(hackathon.time_left_to_submission);
  const submissionPeriod = asString(hackathon.submission_period_dates);

  return {
    id: `devpost:${url}`,
    title,
    type: "hackathon",
    organization: "Devpost",
    description: title,
    url,
    source: "devpost",
    sourceUrl: url,
    location,
    remote: true,
    ...(prize ? { prize } : {}),
    metadata: {
      themes,
      ...(openState ? { openState } : {}),
      ...(timeLeft ? { timeLeftToSubmission: timeLeft } : {}),
      ...(submissionPeriod ? { submissionPeriodDates: submissionPeriod } : {}),
      ...(typeof hackathon.registrations_count === "number"
        ? { registrationsCount: hackathon.registrations_count }
        : {}),
    },
  };
}

/**
 * Match a keyword against fields available in the discovery response.
 */
function matchesKeyword(
  hackathon: DevpostHackathon,
  keyword?: string,
): boolean {
  if (!keyword?.trim()) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase().trim();

  const searchableText = [
    asString(hackathon.title),
    asString(hackathon.displayed_location),
    asString(hackathon.prize_amount),
    asString(hackathon.submission_period_dates),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedKeyword);
}

/**
 * Parse ROUTE's Devpost pagination cursor.
 *
 * Example: devpost:18
 */
function parseCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  const match = /^devpost:(\d+)$/.exec(cursor);

  if (!match) {
    return 0;
  }

  const offset = Number(match[1]);

  return Number.isFinite(offset) && offset >= 0 ? offset : 0;
}

/**
 * Extract the hackathon overview/description when available.
 */
function extractChallengeDescription(html: string): string {
  const $ = cheerio.load(html);
  const description = $("#challenge-description").first();

  if (description.length === 0) {
    return cleanHtml(html);
  }

  description.find("script, style, iframe, noscript, svg").remove();

  return description
    .text()
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Extract a human-readable title for a retrieved page.
 */
function extractPageTitle(html: string, fallback: string): string {
  const $ = cheerio.load(html);

  const heading = $("h1").first().text().replace(/\s+/g, " ").trim();
  const documentTitle = $("title").first().text().replace(/\s+/g, " ").trim();

  return heading || documentTitle || fallback;
}

/**
 * Extract the main available text from one page.
 *
 * We prefer semantic main content, but fall back to the body when the
 * page does not provide a main-content container.
 *
 * This preserves source text rather than generating a summary.
 */
function extractPageText(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, iframe, noscript, svg").remove();

  const main = $("main, [role='main']").first();
  const contentRoot = main.length > 0 ? main : $("body").first();

  contentRoot
    .find("nav, footer, aside, script, style, iframe, noscript, svg")
    .remove();

  return contentRoot
    .text()
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Preserve a retrieved page as its own source entry.
 *
 * A page with no extractable text is omitted instead of being reported
 * as retrieved content.
 */
function createSourceContent(
  page: RetrievedPage,
  opportunityTitle: string,
): PreparationSourceContent | null {
  const content = extractPageText(page.html);

  if (!content) {
    return null;
  }

  return {
    title: page.title || `${opportunityTitle} — Source page`,
    content,
    url: page.url,
  };
}

/**
 * Discover relevant links from a page.
 *
 * Safety and scope:
 * - Only HTTPS links are accepted.
 * - Links must use the exact hostname of the hackathon page.
 * - Links must match relevant preparation-related text or URL patterns.
 * - The current page and duplicate URLs are excluded.
 *
 * We deliberately do not crawl unrelated external sites or other
 * Devpost hackathons.
 */
function discoverRelevantPageLinks(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const baseUrl = new URL(pageUrl);
  const discovered = new Set<string>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");

    if (!href) {
      return;
    }

    const linkText = anchor.text().replace(/\s+/g, " ").trim();

    try {
      const resolved = new URL(href, baseUrl);

      // Avoid external pages, HTTP links, and other Devpost subdomains.
      if (
        resolved.protocol !== "https:" ||
        resolved.hostname !== baseUrl.hostname
      ) {
        return;
      }

      // Never crawl account, registration, or submission-management pages.
      if (EXCLUDED_PAGE_PATH_PATTERN.test(resolved.pathname)) {
        return;
      }

      // Ignore links that do not appear relevant to preparation.
      //
      // Only the path is checked, not the query string, so form or
      // tracking parameters cannot make an unrelated link look relevant.
      if (
        !RELEVANT_PAGE_LINK_PATTERN.test(linkText) &&
        !RELEVANT_PAGE_LINK_PATTERN.test(resolved.pathname)
      ) {
        return;
      }

      // Remove fragments so multiple links to the same section are deduped.
      resolved.hash = "";

      const normalized = normalizeUrl(resolved.toString());

      if (normalized === normalizeUrl(pageUrl)) {
        return;
      }

      discovered.add(normalized);
    } catch {
      // A malformed link should not fail the entire preparation request.
    }
  });

  return [...discovered];
}

/**
 * Fetch one page.
 *
 * A non-success response, a non-HTML response, or a redirect away from
 * the hackathon host is treated as a page-level failure. The caller
 * catches network errors and timeouts and continues with other
 * discovered pages.
 */
async function fetchPage(url: string): Promise<RetrievedPage | null> {
  // Do not send an Accept header. Devpost answers 403 to requests that
  // include one (verified for the overview, /rules and /resources), while
  // the same request without it succeeds. This matches how the overview
  // page is fetched.
  const response = await fetch(url, {
    signal: AbortSignal.timeout(PREPARATION_PAGE_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  // Skip PDFs and other downloads. A missing header is accepted because
  // some servers omit it.
  const contentType = response.headers.get("content-type");

  if (contentType && !/html/i.test(contentType)) {
    return null;
  }

  // fetch() follows redirects. Record the URL that actually served the
  // content, and reject a redirect to another host (for example a login
  // page) or an excluded path, so such a page is never reported as the
  // page that was requested.
  let finalUrl = url;

  if (response.url) {
    const final = new URL(response.url);

    if (
      final.protocol !== "https:" ||
      final.hostname !== new URL(url).hostname ||
      EXCLUDED_PAGE_PATH_PATTERN.test(final.pathname)
    ) {
      return null;
    }

    finalUrl = normalizeUrl(response.url);
  }

  const html = await response.text();

  return {
    url: finalUrl,
    title: extractPageTitle(html, finalUrl),
    html,
  };
}

/**
 * Fetch relevant linked pages, with bounded concurrency.
 *
 * The first page is the overview, which has already been retrieved by
 * getPreparationContext().
 *
 * This uses a small breadth-first crawl:
 * 1. Discover relevant links on the overview.
 * 2. Fetch a limited batch.
 * 3. Discover relevant links on successfully retrieved pages.
 * 4. Continue until no links remain or the page limit is reached.
 *
 * Failed pages are skipped; they do not discard successful pages.
 *
 * The page limit counts every request made, including the overview and
 * failed requests.
 */
async function fetchLinkedPreparationPages(
  overview: RetrievedPage,
): Promise<RetrievedPage[]> {
  const pages: RetrievedPage[] = [overview];
  const visited = new Set<string>([normalizeUrl(overview.url)]);
  const retrieved = new Set<string>([normalizeUrl(overview.url)]);
  let pending = discoverRelevantPageLinks(overview.html, overview.url);

  // Requests made so far, starting with the overview.
  let attempted = 1;

  while (pending.length > 0 && attempted < MAX_PREPARATION_PAGES) {
    // Keep only URLs not already fetched or queued.
    const batch: string[] = [];

    for (const url of pending) {
      const normalized = normalizeUrl(url);

      if (visited.has(normalized)) {
        continue;
      }

      visited.add(normalized);
      batch.push(normalized);

      if (
        batch.length >= PREPARATION_FETCH_CONCURRENCY ||
        attempted + batch.length >= MAX_PREPARATION_PAGES
      ) {
        break;
      }
    }

    // Remove this batch from the queue. Any excess links remain for later.
    const batchSet = new Set(batch);
    pending = pending.filter((url) => !batchSet.has(normalizeUrl(url)));

    if (batch.length === 0) {
      break;
    }

    attempted += batch.length;

    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          return await fetchPage(url);
        } catch {
          // Keep processing other pages if one fetch fails.
          return null;
        }
      }),
    );

    const retrievedPages = results.filter(
      (page): page is RetrievedPage => page !== null,
    );

    for (const page of retrievedPages) {
      // A redirect can land on a page that was already retrieved.
      const finalUrl = normalizeUrl(page.url);

      if (retrieved.has(finalUrl)) {
        continue;
      }

      retrieved.add(finalUrl);
      visited.add(finalUrl);
      pages.push(page);

      // Some useful pages link to more specific rules or submission tips.
      const additionalLinks = discoverRelevantPageLinks(page.html, page.url);

      for (const link of additionalLinks) {
        const normalized = normalizeUrl(link);

        if (!visited.has(normalized)) {
          pending.push(normalized);
        }
      }
    }
  }

  return pages;
}

/**
 * The parts of a parsed DOM node that heading detection needs.
 *
 * Cheerio 1.x does not export its node types, so describe the minimum
 * shape here instead of importing from its transitive dependency.
 */
interface HeadingNodeLike {
  type: string;
  name?: string;
}

/**
 * Return the level of an HTML heading node.
 */
function getHeadingLevel(node: HeadingNodeLike): number {
  if (node.type !== "tag") {
    return 6;
  }

  const match = /^h([1-6])$/i.exec(node.name ?? "");

  return match ? Number(match[1]) : 6;
}

/**
 * Find a heading by exact normalized text.
 */
function findHeading($: cheerio.CheerioAPI, headingText: string) {
  const target = headingText.replace(/\s+/g, " ").trim().toLowerCase();

  return $("h1, h2, h3, h4, h5, h6")
    .filter((_, node) => {
      return (
        $(node).text().replace(/\s+/g, " ").trim().toLowerCase() === target
      );
    })
    .first();
}

/**
 * Extract list items following a known heading.
 *
 * This supports common heading/sibling layouts. If a site uses a
 * different layout, sourceContent still preserves the retrieved text.
 */
function extractSectionListItems(
  $: cheerio.CheerioAPI,
  headingText: string,
): string[] {
  const heading = findHeading($, headingText);
  const headingNode = heading.get(0);

  if (!headingNode) {
    return [];
  }

  const headingLevel = getHeadingLevel(headingNode);
  const results: string[] = [];

  let current = heading.next();

  while (current.length > 0) {
    const currentNode = current.get(0);

    if (!currentNode) {
      break;
    }

    const tagName =
      currentNode.type === "tag" ? currentNode.name.toLowerCase() : "";

    if (/^h[1-6]$/.test(tagName)) {
      if (getHeadingLevel(currentNode) <= headingLevel) {
        break;
      }
    }

    current
      .find("li")
      .addBack("li")
      .each((_, item) => {
        const text = $(item).text().replace(/\s+/g, " ").trim();

        if (text && !/^(view schedule|apple|google|outlook)$/i.test(text)) {
          results.push(text);
        }
      });

    current = current.next();
  }

  return [...new Set(results)];
}

/**
 * Extract a deadline only when the page explicitly associates a date
 * with a submission or deadline label.
 *
 * The returned value keeps the source's wording. We do not infer a
 * time or timezone that the matched text does not contain.
 */
function extractDeadline($: cheerio.CheerioAPI): string | undefined {
  const bodyText = $("body").first().text().replace(/\s+/g, " ").trim();

  const date = "([A-Z][a-z]{2,9}\\s+\\d{1,2},\\s+\\d{4})";

  const patterns = [
    new RegExp(
      `(?:final projects are due|final submissions are due|submission deadline|applications close|submissions close|deadline)\\s*(?:is|:|-)?\\s*${date}`,
      "i",
    ),
    new RegExp(
      `${date}\\s*(?:is the )?(?:submission deadline|final submission deadline)`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Find a submission-related destination.
 *
 * The URL may require login. Returning it does not mean ROUTE can submit
 * an entry on the user's behalf.
 */
function extractSubmissionUrl($: cheerio.CheerioAPI): string | undefined {
  let submissionUrl: string | undefined;

  $("a[href]").each((_, element) => {
    if (submissionUrl) {
      return;
    }

    const href = $(element).attr("href");

    if (!href || !/\/submit-to\/|submission/i.test(href)) {
      return;
    }

    try {
      const resolved = new URL(href, "https://devpost.com");

      if (resolved.protocol === "https:" || resolved.protocol === "http:") {
        submissionUrl = resolved.toString();
      }
    } catch {
      // Ignore malformed links.
    }
  });

  return submissionUrl;
}

/**
 * Extract a prize amount only when it appears near explicit prize language.
 */
function extractPrize($: cheerio.CheerioAPI): string | undefined {
  const bodyText = $("body").first().text().replace(/\s+/g, " ").trim();

  const amount = String.raw`(\$\s?[\d,]+(?:\.\d+)?\s?(?:K|M|million|thousand)?)`;

  const patterns = [
    new RegExp(
      String.raw`(?:total prizes?|prize pool|prizes? worth|cash prizes?|awards? totaling|awards? worth)[^.!?]{0,120}?${amount}`,
      "i",
    ),
    new RegExp(
      String.raw`${amount}[^.!?]{0,80}?(?:in prizes?|in cash prizes?|in awards?)`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);

    if (!match) {
      continue;
    }

    // Pattern one captures the amount in group 1.
    // Pattern two also captures the amount in group 1.
    const prize = match[1]?.trim();

    if (prize) {
      return prize;
    }
  }

  return undefined;
}

/**
 * Extract the organizer from an explicit organization link or JSON-LD.
 */
function extractOrganization($: cheerio.CheerioAPI): string {
  const organizationLink = $('a[href*="/organizations/"]').first();
  const linkedName = organizationLink.text().replace(/\s+/g, " ").trim();

  if (linkedName) {
    return linkedName;
  }

  let jsonLdOrganization: string | undefined;

  $('script[type="application/ld+json"]').each((_, element) => {
    if (jsonLdOrganization) {
      return;
    }

    const raw = $(element).html();

    if (!raw) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") {
          continue;
        }

        const record = candidate as Record<string, unknown>;
        const organizer = record.organizer;

        if (!organizer || typeof organizer !== "object") {
          continue;
        }

        const name = asString((organizer as Record<string, unknown>).name);

        if (name) {
          jsonLdOrganization = name;
          break;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return jsonLdOrganization ?? "Devpost";
}

/**
 * Extract structured preparation facts from one page.
 *
 * These fields are a convenience layer; each page's original text is
 * also preserved independently in sourceContent.
 */
function extractPreparationFromDevpostPage(
  html: string,
): OpportunityPreparationContext["preparation"] {
  const $ = cheerio.load(html);
  const preparation: OpportunityPreparationContext["preparation"] = {};

  const deadline = extractDeadline($);

  if (deadline) {
    preparation.importantDates = [{ label: "Deadline", value: deadline }];
  }

  const eligibilityItems = extractSectionListItems($, "Who can participate");

  if (eligibilityItems.length > 0) {
    const eligibility: PreparationEligibility[] = [];

    eligibilityItems.forEach((item, index) => {
      eligibility.push({
        title: index === 0 ? "Eligibility" : "Additional eligibility",
        description: item,
      });
    });

    preparation.eligibility = eligibility;
  }

  const requirementItems = extractSectionListItems($, "Requirements");

  if (requirementItems.length > 0) {
    preparation.requirements = requirementItems.map(
      (requirement): PreparationRequirement => ({
        title: requirement,
      }),
    );
  }

  const projectAreas = extractSectionListItems($, "Suggested Project Areas");

  if (projectAreas.length > 0) {
    preparation.categories = projectAreas.map((area) => ({
      name: area,
    }));
  }

  const submissionItems = extractSectionListItems(
    $,
    "Final Submission Requirements",
  );

  const submissionUrl = extractSubmissionUrl($);

  if (submissionItems.length > 0 || submissionUrl) {
    preparation.submission = {
      ...(submissionItems.length > 0
        ? {
            requirements: submissionItems,
            instructions: submissionItems.join("\n• "),
          }
        : {}),
      ...(submissionUrl ? { submissionUrl } : {}),
    };
  }

  return preparation;
}

/**
 * Merge structured facts from several retrieved pages.
 *
 * Values are deduplicated without inventing or rewriting their content.
 * Source URLs remain available in sourceContent for independent checking.
 */
function mergePreparation(
  pages: RetrievedPage[],
): OpportunityPreparationContext["preparation"] {
  const merged: OpportunityPreparationContext["preparation"] = {};

  const dates: NonNullable<
    OpportunityPreparationContext["preparation"]["importantDates"]
  > = [];

  const requirements: NonNullable<
    OpportunityPreparationContext["preparation"]["requirements"]
  > = [];

  const eligibility: NonNullable<
    OpportunityPreparationContext["preparation"]["eligibility"]
  > = [];

  const constraints: NonNullable<
    OpportunityPreparationContext["preparation"]["constraints"]
  > = [];

  const categories: NonNullable<
    OpportunityPreparationContext["preparation"]["categories"]
  > = [];

  const submissionRequirements = new Set<string>();
  const submissionInstructions: string[] = [];
  let submissionUrl: string | undefined;

  for (const page of pages) {
    const preparation = extractPreparationFromDevpostPage(page.html);

    dates.push(...(preparation.importantDates ?? []));
    requirements.push(...(preparation.requirements ?? []));
    eligibility.push(...(preparation.eligibility ?? []));
    constraints.push(...(preparation.constraints ?? []));
    categories.push(...(preparation.categories ?? []));

    for (const requirement of preparation.submission?.requirements ?? []) {
      submissionRequirements.add(requirement);
    }

    if (preparation.submission?.instructions) {
      submissionInstructions.push(preparation.submission.instructions);
    }

    submissionUrl ??= preparation.submission?.submissionUrl;
  }

  // Deduplicate objects by their serialized content.
  const uniqueObjects = <T>(items: T[]): T[] => {
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = JSON.stringify(item);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  if (dates.length > 0) {
    merged.importantDates = uniqueObjects(dates);
  }

  if (requirements.length > 0) {
    merged.requirements = uniqueObjects(requirements);
  }

  if (eligibility.length > 0) {
    merged.eligibility = uniqueObjects(eligibility);
  }

  if (constraints.length > 0) {
    merged.constraints = uniqueObjects(constraints);
  }

  if (categories.length > 0) {
    merged.categories = uniqueObjects(categories);
  }

  if (
    submissionRequirements.size > 0 ||
    submissionInstructions.length > 0 ||
    submissionUrl
  ) {
    merged.submission = {
      ...(submissionRequirements.size > 0
        ? { requirements: [...submissionRequirements] }
        : {}),
      ...(submissionInstructions.length > 0
        ? {
            instructions: [...new Set(submissionInstructions)].join("\n\n"),
          }
        : {}),
      ...(submissionUrl ? { submissionUrl } : {}),
    };
  }

  return merged;
}

/**
 * Extract a normalized Opportunity from a direct Devpost page.
 */
function extractOpportunityFromDevpostPage(
  html: string,
  url: string,
): Opportunity | null {
  const $ = cheerio.load(html);
  const normalizedUrl = normalizeUrl(url);

  const title =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim();

  if (!title) {
    return null;
  }

  const description = extractChallengeDescription(html);
  const organization = extractOrganization($);
  const deadline = extractDeadline($);
  const prize = extractPrize($);

  return {
    id: `devpost:url:${normalizedUrl}`,
    title,
    type: "hackathon",
    organization,
    description,
    url: normalizedUrl,
    source: "devpost",
    sourceUrl: normalizedUrl,
    location: "online",
    remote: true,
    ...(deadline ? { deadline } : {}),
    ...(prize ? { prize } : {}),
    metadata: {
      themes: [],
    },
  };
}

/**
 * Devpost opportunity provider implementation.
 */
export class DevpostProvider implements OpportunityProvider {
  readonly name = "devpost";

  readonly supportedTypes: readonly OpportunityType[] = ["hackathon"];

  /**
   * Accept only HTTPS Devpost URLs and their subdomains.
   */
  canHandleUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      return (
        parsed.protocol === "https:" &&
        (parsed.hostname === "devpost.com" ||
          parsed.hostname.endsWith(".devpost.com"))
      );
    } catch {
      return false;
    }
  }

  /**
   * Search Devpost's public hackathon API.
   *
   * Discovery behavior remains separate from preparation retrieval.
   */
  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunityProviderResult> {
    const requestedLimit = params.limit ?? DEFAULT_PAGE_SIZE;
    const limit = Math.max(1, Math.min(requestedLimit, DEFAULT_PAGE_SIZE));

    const offset = parseCursor(params.cursor);
    const opportunities: Opportunity[] = [];

    let currentOffset = offset;
    let pagesFetched = 0;

    while (
      opportunities.length < limit &&
      pagesFetched < MAX_PAGES_PER_SEARCH
    ) {
      const page = Math.floor(currentOffset / DEFAULT_PAGE_SIZE) + 1;
      const response = await fetch(`${DEVPOST_API_URL}?page=${page}`);

      if (!response.ok) {
        throw new Error(`Devpost API request failed with ${response.status}.`);
      }

      const data = (await response.json()) as DevpostApiResponse;

      const rawHackathons = Array.isArray(data.hackathons)
        ? data.hackathons
        : [];

      const hackathons = rawHackathons.filter(isDevpostHackathon);

      if (hackathons.length === 0) {
        break;
      }

      for (const hackathon of hackathons) {
        if (!matchesKeyword(hackathon, params.keyword)) {
          continue;
        }

        const opportunity = normalizeHackathon(hackathon);

        if (!opportunity) {
          continue;
        }

        if (
          params.type &&
          params.type !== "all" &&
          params.type !== opportunity.type
        ) {
          continue;
        }

        opportunities.push(opportunity);

        if (opportunities.length >= limit) {
          break;
        }
      }

      currentOffset += hackathons.length;
      pagesFetched += 1;

      if (hackathons.length < DEFAULT_PAGE_SIZE) {
        break;
      }
    }

    const nextCursor =
      opportunities.length >= limit ? `devpost:${currentOffset}` : undefined;

    return {
      opportunities,
      ...(nextCursor ? { nextCursor } : {}),
    };
  }

  /**
   * Retrieve a specific Devpost hackathon by URL.
   *
   * A non-success HTTP response returns null. Network failures may throw.
   */
  async getByUrl(url: string): Promise<Opportunity | null> {
    if (!this.canHandleUrl(url)) {
      return null;
    }

    const normalizedUrl = normalizeUrl(url);
    const response = await fetch(normalizedUrl);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return extractOpportunityFromDevpostPage(html, normalizedUrl);
  }

  /**
   * Retrieve preparation context for a Devpost opportunity.
   *
   * Workflow:
   * 1. Fetch the overview page.
   * 2. Discover relevant same-hackathon links.
   * 3. Fetch linked pages within the configured limit.
   * 4. Preserve each successfully retrieved page separately.
   * 5. Merge structured facts extracted from those pages.
   *
   * No LLM-generated summaries or inferred facts are added.
   */
  async getPreparationContext(
    opportunity: Opportunity,
  ): Promise<OpportunityPreparationContext> {
    const overviewUrl = normalizeUrl(opportunity.url);
    const response = await fetch(overviewUrl);

    if (!response.ok) {
      throw new Error(
        `Devpost preparation request failed with ${response.status}.`,
      );
    }

    const overviewHtml = await response.text();

    const overview: RetrievedPage = {
      url: overviewUrl,
      title: extractPageTitle(overviewHtml, opportunity.title),
      html: overviewHtml,
    };

    // Retrieve relevant pages discovered from the overview and its pages.
    const retrievedPages = await fetchLinkedPreparationPages(overview);

    // Keep every successful page as independent, source-backed content.
    const sourceContent: PreparationSourceContent[] = retrievedPages
      .map((page) => createSourceContent(page, opportunity.title))
      .filter((entry): entry is PreparationSourceContent => entry !== null);

    // Extract structured facts across all retrieved pages.
    const preparation = mergePreparation(retrievedPages);

    return {
      opportunity,
      preparation,
      ...(sourceContent.length > 0 ? { sourceContent } : {}),
      source: {
        provider: this.name,
        url: overviewUrl,
        retrievedAt: new Date().toISOString(),
      },
    };
  }
}
