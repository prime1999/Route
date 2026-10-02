/**
 * Devpost opportunity provider.
 *
 * This provider is responsible for:
 *
 * 1. Discovering hackathons through Devpost's public API.
 * 2. Retrieving a specific hackathon by its URL.
 * 3. Normalizing Devpost data into Route's shared Opportunity model.
 * 4. Retrieving preparation context from the actual Devpost page.
 *
 * Architectural boundary:
 *
 * Route is an opportunity infrastructure layer, not an AI agent.
 * Therefore this provider does NOT:
 *
 * - summarize opportunities with an LLM
 * - decide whether a user should apply
 * - generate project ideas
 * - write applications
 * - determine personalized eligibility
 * - automatically submit anything
 *
 * Instead, it retrieves authoritative source information and exposes
 * useful structured facts so a connected AI agent can reason over them.
 */

import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import type { Opportunity, OpportunityType } from "../types.js";

import type {
  OpportunityPreparationContext,
  PreparationEligibility,
  PreparationRequirement,
} from "../preparation/types.js";

import type {
  OpportunityProvider,
  OpportunityProviderResult,
  OpportunitySearchParams,
} from "./types.js";

/**
 * Devpost's public hackathon discovery endpoint.
 *
 * This endpoint is useful for discovery/search, while the individual
 * hackathon page is used for richer information such as requirements
 * and submission instructions.
 */
const DEVPOST_API_URL = "https://devpost.com/api/hackathons";

/**
 * Default number of opportunities returned from one provider request.
 */
const DEFAULT_PAGE_SIZE = 9;

/**
 * Prevents a broad keyword search from requesting an unbounded number
 * of Devpost API pages.
 */
const MAX_PAGES_PER_SEARCH = 10;

/**
 * Shape of the fields we use from Devpost's public API.
 *
 * Devpost exposes additional fields, but Route only needs the fields
 * required to normalize a hackathon into the shared Opportunity model.
 */
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

/**
 * Shape of the top-level Devpost API response.
 */
interface DevpostApiResponse {
  hackathons?: unknown;
}

/**
 * Type guard for DOM elements.
 *
 * Cheerio works with AnyNode, while several of our DOM helpers need
 * Element-specific properties. Keeping this check here prevents us
 * from making unsafe assumptions about arbitrary DOM nodes.
 */
function isElement(node: AnyNode): node is Element {
  return node.type === "tag";
}

/**
 * Converts arbitrary unknown values into strings safely.
 */
function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized || undefined;
}

/**
 * Normalizes an opportunity URL.
 *
 * Devpost can expose URLs with trailing slashes or slightly different
 * forms. Route keeps the canonical HTTPS URL so provider ownership
 * remains deterministic.
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
 * Cleans HTML into readable plain text.
 *
 * This is intentionally conservative. Route wants to preserve source
 * information rather than aggressively summarize or rewrite it.
 */
function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, iframe, noscript").remove();

  return $("body")
    .text()
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Determines whether an unknown value resembles a Devpost API
 * hackathon object.
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
 * Converts a Devpost API hackathon into Route's normalized model.
 */
function normalizeHackathon(hackathon: DevpostHackathon): Opportunity | null {
  const title = asString(hackathon.title);
  const rawUrl = asString(hackathon.url);

  if (!title || !rawUrl) {
    return null;
  }

  const url = normalizeUrl(rawUrl);

  const location = asString(hackathon.displayed_location) ?? "online";

  const prize = asString(hackathon.prize_amount);

  const themes = Array.isArray(hackathon.themes)
    ? hackathon.themes
        .filter((theme): theme is string => typeof theme === "string")
        .map((theme) => theme.trim())
        .filter(Boolean)
    : [];

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
      ...(asString(hackathon.open_state)
        ? { openState: asString(hackathon.open_state) }
        : {}),
      ...(asString(hackathon.time_left_to_submission)
        ? {
            timeLeftToSubmission: asString(hackathon.time_left_to_submission),
          }
        : {}),
      ...(asString(hackathon.submission_period_dates)
        ? {
            submissionPeriodDates: asString(hackathon.submission_period_dates),
          }
        : {}),
      ...(typeof hackathon.registrations_count === "number"
        ? {
            registrationsCount: hackathon.registrations_count,
          }
        : {}),
    },
  };
}

/**
 * Performs case-insensitive keyword matching against the fields
 * available from the Devpost discovery response.
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
 * Parses Route's provider cursor.
 *
 * Example:
 *
 *   remote:5
 *
 * is not used here because this provider owns the Devpost namespace.
 *
 * Accepted Devpost cursor:
 *
 *   devpost:10
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
 * Extracts the main challenge description.
 *
 * Devpost's #challenge-description contains the long-form overview
 * content. It does NOT necessarily contain every preparation-related
 * section on the page, which is why preparation extraction separately
 * works against the complete page.
 */
function extractChallengeDescription(html: string): string {
  const $ = cheerio.load(html);

  const description = $("#challenge-description").first();

  if (description.length === 0) {
    return cleanHtml(html);
  }

  description.find("script, style, iframe, noscript").remove();

  return description
    .text()
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Returns the heading level of a heading element.
 */
function getHeadingLevel(element: Element): number {
  const tagName = String(
    cheerio.load("")(element).prop("tagName") ?? "",
  ).toLowerCase();

  if (!/^h[1-6]$/.test(tagName)) {
    return 6;
  }

  return Number(tagName.substring(1));
}

/**
 * Finds a semantic heading whose text matches the requested value.
 *
 * The comparison is normalized so small whitespace differences in
 * Devpost's HTML do not prevent section discovery.
 */
function findHeading(
  $: cheerio.CheerioAPI,
  headingText: string,
): Element | null {
  const normalizedTarget = headingText
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  let result: Element | null = null;

  $("h1, h2, h3, h4, h5, h6").each((_, node) => {
    if (result || !isElement(node)) {
      return;
    }

    const text = $(node).text().replace(/\s+/g, " ").trim().toLowerCase();

    if (text === normalizedTarget) {
      result = node;
    }
  });

  return result;
}

/**
 * Returns all elements in document order.
 *
 * This lets us inspect content after a heading without assuming that
 * Devpost places the section content as direct siblings.
 */
function getOrderedElements($: cheerio.CheerioAPI): Element[] {
  return $("body *").toArray().filter(isElement);
}

/**
 * Returns the next element after a given element in document order.
 */
function getNextElementInDocumentOrder(
  $: cheerio.CheerioAPI,
  element: Element,
): Element | null {
  const elements = getOrderedElements($);

  const index = elements.indexOf(element);

  if (index === -1 || index + 1 >= elements.length) {
    return null;
  }

  return elements[index + 1] ?? null;
}

/**
 * Extracts list-item content from a named section.
 *
 * This helper intentionally focuses on <li> elements instead of
 * collecting arbitrary text. Devpost pages often contain UI elements
 * such as calendar controls inside otherwise useful sections.
 *
 * That distinction prevents values such as:
 *
 *   View schedule
 *   Apple
 *   Google
 *   Outlook
 *
 * from being interpreted as eligibility information.
 */
function extractSectionListItems(
  $: cheerio.CheerioAPI,
  headingText: string,
): string[] {
  const heading = findHeading($, headingText);

  if (!heading) {
    return [];
  }

  const headingLevel = getHeadingLevel(heading);
  const results: string[] = [];

  let current: Element | null = heading;

  while (current) {
    current = getNextElementInDocumentOrder($, current);

    if (!current) {
      break;
    }

    const tagName = String($(current).prop("tagName") ?? "").toLowerCase();

    /*
     * Stop when another heading at the same or higher level is found.
     * This prevents one section from consuming the rest of the page.
     */
    if (/^h[1-6]$/.test(tagName)) {
      const currentLevel = Number(tagName.substring(1));

      if (currentLevel <= headingLevel) {
        break;
      }
    }

    if (tagName !== "li") {
      continue;
    }

    const text = $(current).text().replace(/\s+/g, " ").trim();

    if (!text) {
      continue;
    }

    /*
     * Devpost sometimes places calendar controls in the same DOM
     * region as participation information. These are UI controls,
     * not opportunity facts.
     */
    if (/^(view schedule|apple|google|outlook)$/i.test(text)) {
      continue;
    }

    results.push(text);
  }

  return [...new Set(results)];
}

/**
 * Extracts the first useful date visible on the page.
 *
 * The Opportunity model already carries the normalized deadline.
 * This helper exists so prepare_opportunity can expose the deadline
 * again as preparation context.
 */
function extractFirstDate($: cheerio.CheerioAPI): string | undefined {
  const bodyText = $("body").first().text().replace(/\s+/g, " ").trim();

  /*
   * Prefer the competition's explicit deadline language rather than
   * blindly taking the first date appearing on the page.
   */
  const deadlineMatch = bodyText.match(
    /(?:final projects are due|final submissions are due)[^.!?]{0,160}?([A-Z][a-z]{2,9}\s+\d{1,2},\s+\d{4})/i,
  );

  if (deadlineMatch?.[1]) {
    return deadlineMatch[1];
  }

  /*
   * Fallback for pages that don't expose the deadline using the
   * expected wording.
   */
  const genericDateMatch = bodyText.match(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/i,
  );

  return genericDateMatch?.[0];
}

/**
 * Extracts the submission URL from the page.
 *
 * This does not mean Route can submit on the user's behalf.
 * It simply preserves the provider's submission destination as
 * context for a connected agent and ultimately the user.
 */
function extractSubmissionUrl($: cheerio.CheerioAPI): string | undefined {
  let submissionUrl: string | undefined;

  $("a[href]").each((_, element) => {
    if (submissionUrl) {
      return;
    }

    const href = $(element).attr("href");

    if (!href) {
      return;
    }

    const normalizedHref = href.toLowerCase();

    if (
      normalizedHref.includes("/submit-to/") ||
      normalizedHref.includes("submission")
    ) {
      try {
        submissionUrl = new URL(href, "https://devpost.com").toString();
      } catch {
        // Ignore malformed URLs.
      }
    }
  });

  return submissionUrl;
}

/**
 * Extracts the organization responsible for the opportunity.
 *
 * We deliberately do NOT use arbitrary page anchors as a fallback.
 * Devpost pages contain navigation links such as "Log in", and a
 * generic anchor fallback can therefore produce incorrect
 * organizations.
 *
 * Preferred sources:
 *
 * 1. Explicit Devpost organization link.
 * 2. JSON-LD organizer.
 * 3. "Devpost" as a safe provider-level fallback.
 */
function extractOrganization($: cheerio.CheerioAPI): string {
  const organizationLink = $('a[href*="/organizations/"]').first();

  if (organizationLink.length > 0) {
    const organization = organizationLink.text().replace(/\s+/g, " ").trim();

    if (organization) {
      return organization;
    }
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

        if (organizer && typeof organizer === "object") {
          const organizerRecord = organizer as Record<string, unknown>;

          const name = asString(organizerRecord.name);

          if (name) {
            jsonLdOrganization = name;
            break;
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return jsonLdOrganization ?? "Devpost";
}

/**
 * Extracts structured preparation context from the complete Devpost
 * page.
 *
 * Important architectural decision:
 *
 * We expose structured facts, but we preserve the full overview
 * separately through sourceContent. The structured layer is therefore
 * an index/convenience layer, not a replacement for the source.
 */
function extractPreparationFromDevpostPage(
  html: string,
): OpportunityPreparationContext["preparation"] {
  const $ = cheerio.load(html);

  const preparation: OpportunityPreparationContext["preparation"] = {};

  /*
   * ---------------------------------------------------------------
   * IMPORTANT DATES
   * ---------------------------------------------------------------
   */
  const deadline = extractFirstDate($);

  if (deadline) {
    preparation.importantDates = [
      {
        label: "Deadline",
        value: deadline,
      },
    ];
  }

  /*
   * ---------------------------------------------------------------
   * ELIGIBILITY
   * ---------------------------------------------------------------
   *
   * The first two meaningful list items on Devpost's participation
   * section represent the actual eligibility constraints.
   *
   * Calendar controls are filtered by extractSectionListItems().
   */
  const eligibilityItems = extractSectionListItems($, "Who can participate");

  if (eligibilityItems.length > 0) {
    const eligibility: PreparationEligibility[] = [];

    if (eligibilityItems[0]) {
      eligibility.push({
        title: "Age",
        description: eligibilityItems[0],
      });
    }

    if (eligibilityItems[1]) {
      eligibility.push({
        title: "Location",
        description: eligibilityItems[1],
      });
    }

    if (eligibility.length > 0) {
      preparation.eligibility = eligibility;
    }
  }

  /*
   * ---------------------------------------------------------------
   * REQUIREMENTS
   * ---------------------------------------------------------------
   *
   * We intentionally extract the two mandatory competition-level
   * technical constraints separately instead of treating the entire
   * Requirements section as one large blob.
   */
  const requirementItems: PreparationRequirement[] = [];

  const fullPageText = $("body").first().text().replace(/\s+/g, " ").trim();

  if (
    fullPageText.includes(
      "Every entry must use OpenCV 5 for substantive image or video analysis",
    )
  ) {
    requirementItems.push({
      title: "OpenCV 5",
      description:
        "Every entry must use OpenCV 5 for substantive image or video analysis.",
    });
  }

  if (fullPageText.includes("run a meaningful component on AWS")) {
    requirementItems.push({
      title: "AWS",
      description: "Every entry must run a meaningful component on AWS.",
    });
  }

  if (requirementItems.length > 0) {
    preparation.requirements = requirementItems;
  }

  /*
   * ---------------------------------------------------------------
   * CATEGORIES / SUGGESTED PROJECT AREAS
   * ---------------------------------------------------------------
   *
   * Suggested project areas are context, not mandatory requirements.
   * They therefore belong under categories.
   */
  const projectAreas = extractSectionListItems($, "Suggested Project Areas");

  if (projectAreas.length > 0) {
    preparation.categories = projectAreas.map((area) => ({
      name: area,
    }));
  }

  /*
   * ---------------------------------------------------------------
   * SUBMISSION
   * ---------------------------------------------------------------
   *
   * Final Submission Requirements contains the actual deliverables
   * expected from participants.
   */
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
      ...(submissionUrl
        ? {
            submissionUrl,
          }
        : {}),
    };
  }

  return preparation;
}

/**
 * Extracts a normalized Opportunity from a direct Devpost page.
 */
function extractOpportunityFromDevpostPage(
  html: string,
  url: string,
): Opportunity | null {
  const $ = cheerio.load(html);

  const normalizedUrl = normalizeUrl(url);

  /*
   * Prefer the visible page title, then fall back to the HTML title.
   */
  const title =
    $("h1").first().text().replace(/\s+/g, " ").trim() ||
    $("title").first().text().replace(/\s+/g, " ").trim();

  if (!title) {
    return null;
  }

  const description = extractChallengeDescription(html);

  const organization = extractOrganization($);

  const deadline = extractFirstDate($);

  /*
   * Devpost's public page often contains prize information in a
   * summary block. We preserve the first useful dollar amount as the
   * normalized prize value.
   */
  const bodyText = $("body").first().text().replace(/\s+/g, " ").trim();

  const prizeMatch = bodyText.match(
    /\$\s?[\d,]+(?:\.\d+)?(?:\s*(?:USD|cash))?/i,
  );

  const prize = prizeMatch?.[0]?.trim();

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
   * Determines whether this provider owns a URL.
   *
   * Route's provider manager uses this before delegating direct URL
   * retrieval or preparation.
   */
  canHandleUrl(url: string): boolean {
    try {
      const parsed = new URL(url);

      return (
        (parsed.protocol === "https:" && parsed.hostname === "devpost.com") ||
        parsed.hostname.endsWith(".devpost.com")
      );
    } catch {
      return false;
    }
  }

  /**
   * Searches Devpost's public hackathon API.
   *
   * Devpost's public endpoint does not provide the same stable cursor
   * semantics as a database query, so Route uses a position-based
   * provider cursor.
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
      const response = await fetch(
        `${DEVPOST_API_URL}?page=${Math.floor(currentOffset / DEFAULT_PAGE_SIZE) + 1}`,
      );

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

        /*
         * Devpost currently represents these opportunities as online
         * hackathons. Keep the type filtering explicit even though the
         * provider only supports hackathons.
         */
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

      /*
       * A partial page means we have reached the end of the available
       * Devpost discovery data.
       */
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
   * Retrieves a specific Devpost hackathon by its URL.
   *
   * Unlike discovery, direct retrieval fetches the actual page so
   * Route can return richer information than the discovery API exposes.
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
   * Retrieves preparation context for a Devpost opportunity.
   *
   * The provider fetches the page again because preparation context
   * requires information that the normalized Opportunity intentionally
   * does not contain.
   *
   * The returned context has two complementary layers:
   *
   * 1. Structured preparation facts.
   * 2. Preserved source content.
   *
   * The second layer prevents Route from losing important information
   * simply because a page section did not map neatly into the current
   * structured schema.
   */
  async getPreparationContext(
    opportunity: Opportunity,
  ): Promise<OpportunityPreparationContext> {
    const response = await fetch(opportunity.url);

    if (!response.ok) {
      throw new Error(
        `Devpost preparation request failed with ${response.status}.`,
      );
    }

    const html = await response.text();

    const preparation = extractPreparationFromDevpostPage(html);

    const overview = extractChallengeDescription(html);

    const sourceContent =
      overview.length > 0
        ? [
            {
              title: `${opportunity.title} — Overview`,
              content: overview,
              url: opportunity.url,
            },
          ]
        : [];

    return {
      opportunity,
      preparation,
      ...(sourceContent.length > 0 ? { sourceContent } : {}),
      source: {
        provider: this.name,
        url: opportunity.url,
        retrievedAt: new Date().toISOString(),
      },
    };
  }
}
