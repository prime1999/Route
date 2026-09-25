import type { Opportunity } from "../types.js";

import type {
  OpportunityProvider,
  OpportunityProviderResult,
  OpportunitySearchParams,
} from "./types.js";

/**
 * Devpost's public API endpoint.
 *
 * We use the API endpoint rather than scraping the normal
 * Devpost HTML page because the HTML page is protected by
 * AWS WAF while the API provides structured hackathon data.
 */
const DEVPOST_API_URL = "https://devpost.com/api/hackathons";

/**
 * Devpost currently returns 9 hackathons per API page.
 *
 * This is an external-provider detail and therefore stays
 * inside the Devpost provider rather than leaking into Route's
 * general search model.
 */
const DEFAULT_PAGE_SIZE = 9;

/**
 * Safety limit for a single search.
 *
 * This prevents Route from accidentally requesting hundreds
 * or thousands of Devpost pages because of an unusual query.
 */
const MAX_PAGES_PER_SEARCH = 10;

/**
 * Raw hackathon shape returned by Devpost.
 *
 * We only describe the fields Route currently needs.
 */
interface DevpostHackathon {
  id: number;
  title: string;
  displayed_location?: {
    location?: string;
  };
  open_state?: string;
  url: string;
  time_left_to_submission?: string;
  submission_period_dates?: string;
  themes?: Array<{
    name?: string;
  }>;
  prize_amount?: string;
  prizes_counts?: {
    cash?: number;
    other?: number;
  };
  registrations_count?: number;
  organization_name?: string;
  winners_announced?: boolean;
  invite_only?: boolean;
  eligibility_requirement_invite_only_description?: string | null;
  managed_by_devpost_badge?: boolean;
  submission_gallery_url?: string;
  start_a_submission_url?: string;
}

/**
 * Shape of the response returned by Devpost.
 */
interface DevpostApiResponse {
  hackathons?: DevpostHackathon[];

  meta?: {
    total_count?: number;
    per_page?: number;
  };
}

/**
 * Determines whether an unknown value looks like a Devpost
 * hackathon object.
 *
 * We keep this guard intentionally defensive because external
 * APIs are outside Route's control.
 */
function isDevpostHackathon(value: unknown): value is DevpostHackathon {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const hackathon = value as Record<string, unknown>;

  return (
    typeof hackathon.id === "number" &&
    typeof hackathon.title === "string" &&
    typeof hackathon.url === "string"
  );
}

/**
 * Removes HTML tags from values such as:
 *
 * "$<span data-currency-value>740,000</span>"
 *
 * and converts them into:
 *
 * "$740,000"
 */
function cleanHtml(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts a raw Devpost hackathon into Route's normalized
 * Opportunity model.
 */
function normalizeHackathon(hackathon: DevpostHackathon): Opportunity {
  const themes =
    hackathon.themes
      ?.map((theme) => theme.name)
      .filter(
        (theme): theme is string =>
          typeof theme === "string" && theme.length > 0,
      ) ?? [];

  /**
   * Devpost exposes the prize amount as an HTML string.
   * We clean it before storing it in the normalized model.
   */
  const prize = cleanHtml(hackathon.prize_amount);

  /**
   * Devpost's location field is generally "Online" for
   * remote hackathons.
   *
   * We keep the explicit location as well as a normalized
   * boolean because different parts of Route may need either.
   */
  const location = hackathon.displayed_location?.location;

  const remote = location?.toLowerCase() === "online";

  /**
   * Route currently does not have a dedicated description
   * field from Devpost's API.
   *
   * We therefore construct a useful normalized description
   * from the information available to us.
   */
  const descriptionParts = [
    hackathon.title,
    hackathon.organization_name
      ? `hosted by ${hackathon.organization_name}`
      : undefined,
    themes.length > 0 ? `themes: ${themes.join(", ")}` : undefined,
  ].filter(Boolean);

  return {
    id: `devpost:${hackathon.id}`,

    title: hackathon.title,

    type: "hackathon",

    organization: hackathon.organization_name ?? "Unknown organization",

    description: descriptionParts.join(". ") + ".",

    url: hackathon.url,

    source: "devpost",

    /**
     * This is the provider endpoint used by Route to obtain
     * the opportunity data.
     */
    sourceUrl: DEVPOST_API_URL,

    location,

    remote,

    deadline: hackathon.submission_period_dates,

    prize,

    metadata: {
      themes,

      /**
       * This field represents registrations, not submissions
       * or participants.
       */
      registrations: hackathon.registrations_count,

      cashPrizes: hackathon.prizes_counts?.cash,

      otherPrizes: hackathon.prizes_counts?.other,

      submissionPeriod: hackathon.submission_period_dates,

      timeLeft: hackathon.time_left_to_submission,

      openState: hackathon.open_state,

      winnersAnnounced: hackathon.winners_announced,

      inviteOnly: hackathon.invite_only,

      inviteOnlyDescription:
        hackathon.eligibility_requirement_invite_only_description,

      managedByDevpost: hackathon.managed_by_devpost_badge,

      submissionGalleryUrl: hackathon.submission_gallery_url,

      startSubmissionUrl: hackathon.start_a_submission_url,
    },
  };
}

/**
 * Determines whether a normalized opportunity matches
 * the requested keyword.
 *
 * We intentionally search several meaningful fields instead
 * of only matching the title.
 */
function matchesKeyword(opportunity: Opportunity, keyword?: string): boolean {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  const searchableText = [
    opportunity.title,
    opportunity.organization,
    opportunity.description,
    ...(Array.isArray(opportunity.metadata?.themes)
      ? opportunity.metadata.themes
      : []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedKeyword);
}

/**
 * Converts a continuation cursor into a Devpost page number.
 *
 * Example cursor:
 *
 * "devpost:4"
 *
 * becomes:
 *
 * 4
 *
 * We keep the cursor format provider-specific.
 */
function parseCursor(cursor?: string): number {
  if (!cursor) {
    return 1;
  }

  const match = /^devpost:(\d+)$/.exec(cursor);

  if (!match) {
    /**
     * An invalid cursor should not cause the provider
     * to behave unpredictably.
     *
     * We simply restart from page 1.
     */
    return 1;
  }

  const page = Number(match[1]);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

/**
 * Devpost opportunity provider.
 */
export class DevpostProvider implements OpportunityProvider {
  readonly name = "devpost";

  readonly supportedTypes = ["hackathon"] as const;

  /**
   * Determines whether a URL belongs to Devpost.
   *
   * Devpost hackathons can be hosted directly on devpost.com or on
   * Devpost-owned subdomains such as:
   *
   *     https://revenuecat-shipaton-2026.devpost.com/
   *
   * This method only checks URL ownership. It does not make a
   * network request or attempt to retrieve the hackathon.
   */
  canHandleUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      /**
       * Route requires HTTPS for direct opportunity retrieval.
       */
      if (parsedUrl.protocol !== "https:") {
        return false;
      }

      /**
       * Accept either:
       *
       * 1. The main Devpost domain:
       *      devpost.com
       *
       * 2. A genuine Devpost subdomain:
       *      *.devpost.com
       *
       * The dot before "devpost.com" is important. It prevents
       * lookalike domains such as:
       *
       *      evildevpost.com
       *      devpost.com.evil.com
       */
      return (
        parsedUrl.hostname === "devpost.com" ||
        parsedUrl.hostname.endsWith(".devpost.com")
      );
    } catch {
      /**
       * Invalid URLs are not owned by this provider.
       */
      return false;
    }
  }

  /**
   * Search Devpost for matching hackathons.
   *
   * Important:
   * - `limit` means matching opportunities.
   * - Devpost's page size is handled internally.
   * - `cursor` tells us where a previous search stopped.
   */
  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunityProviderResult> {
    /**
     * A Devpost provider only handles hackathons.
     *
     * The Provider Manager normally guarantees this,
     * but keeping this guard here makes the provider safer
     * when used independently.
     */
    if (params.type && params.type !== "hackathon" && params.type !== "all") {
      return {
        opportunities: [],
      };
    }

    /**
     * Default Route-level provider target.
     */
    const limit =
      params.limit && params.limit > 0 ? Math.floor(params.limit) : 10;

    /**
     * Determine where this search should begin.
     *
     * Without a cursor:
     *     page 1
     *
     * With:
     *     devpost:4
     *
     * we begin at page 4.
     */
    let currentPage = parseCursor(params.cursor);

    const results: Opportunity[] = [];

    let pagesFetched = 0;

    let hasMorePages = true;

    while (
      results.length < limit &&
      pagesFetched < MAX_PAGES_PER_SEARCH &&
      hasMorePages
    ) {
      /**
       * Build the Devpost API URL using the provider's
       * own pagination mechanism.
       */
      const url = `${DEVPOST_API_URL}?page=${currentPage}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Devpost API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as DevpostApiResponse;

      const rawHackathons = data.hackathons ?? [];

      /**
       * If Devpost returns an empty page, we have reached
       * the end of the available data.
       */
      if (rawHackathons.length === 0) {
        hasMorePages = false;
        break;
      }

      /**
       * Normalize only valid Devpost records.
       */
      const opportunities = rawHackathons
        .filter(isDevpostHackathon)
        .map(normalizeHackathon);

      /**
       * Apply Route's search filters after normalization.
       */
      for (const opportunity of opportunities) {
        if (results.length >= limit) {
          break;
        }

        if (!matchesKeyword(opportunity, params.keyword)) {
          continue;
        }

        if (params.remote === true && opportunity.remote !== true) {
          continue;
        }

        results.push(opportunity);
      }

      /**
       * Devpost tells us how many records exist in total.
       *
       * We can use that together with the page size to
       * determine whether another page exists.
       */
      const totalCount = data.meta?.total_count;

      const pageSize = data.meta?.per_page ?? DEFAULT_PAGE_SIZE;

      if (typeof totalCount === "number") {
        const lastPage = Math.ceil(totalCount / pageSize);

        hasMorePages = currentPage < lastPage;
      } else {
        /**
         * If Devpost does not provide pagination metadata,
         * assume another page exists when the current page
         * was full.
         */
        hasMorePages = rawHackathons.length >= pageSize;
      }

      /**
       * Move to the next Devpost page.
       */
      currentPage += 1;

      pagesFetched += 1;
    }

    /**
     * If another page is available, expose a continuation
     * cursor pointing to the next page.
     *
     * Example:
     *
     * currentPage = 4
     *
     * nextCursor = "devpost:4"
     */
    const nextCursor = hasMorePages ? `devpost:${currentPage}` : undefined;

    return {
      opportunities: results,

      nextCursor,
    };
  }

  /**
   * Retrieve one specific hackathon from Devpost using its URL.
   *
   * Route's get_opportunity operation is URL-based. When an AI agent
   * receives a Devpost URL from a previous search result, it should
   * not need to know Devpost's internal numeric ID.
   *
   * The provider therefore accepts the URL and resolves the
   * corresponding hackathon through Devpost's API.
   *
   * We intentionally do NOT scrape the normal Devpost HTML page here.
   *
   * During provider investigation, Devpost's normal HTML page was
   * protected by AWS WAF, while the public API returned structured
   * hackathon data. The API is therefore the source used by this
   * provider for both search and direct retrieval.
   *
   * @param url
   * The Devpost hackathon URL supplied by Route.
   *
   * @returns
   * A normalized Route Opportunity when the hackathon can be found,
   * or null when the URL is invalid, does not belong to Devpost,
   * or the requested hackathon cannot be found.
   */
  async getByUrl(url: string): Promise<Opportunity | null> {
    /**
     * -------------------------------------------------------------
     * STEP 1: Parse and validate the URL
     * -------------------------------------------------------------
     *
     * URL parsing happens before any network request.
     *
     * This allows us to safely inspect the hostname and prevents
     * malformed strings from being passed directly to fetch().
     */
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return null;
    }

    /**
     * -------------------------------------------------------------
     * STEP 2: Verify that this is a Devpost URL
     * -------------------------------------------------------------
     *
     * Provider ownership is important because Route may eventually
     * support many opportunity providers.
     *
     * DevpostProvider should only handle URLs belonging to
     * devpost.com.
     *
     * We also require the URL to have a meaningful pathname because
     * the pathname is what we use to identify the requested
     * hackathon.
     */
    if (
      parsedUrl.protocol !== "https:" ||
      (parsedUrl.hostname !== "devpost.com" &&
        !parsedUrl.hostname.endsWith(".devpost.com"))
    ) {
      return null;
    }

    /**
     * -------------------------------------------------------------
     * STEP 3: Extract the requested hackathon URL
     * -------------------------------------------------------------
     *
     * Devpost's API returns the canonical URL for each hackathon.
     *
     * We normalize the incoming URL by removing a trailing slash
     * so that these two forms can be compared consistently:
     *
     * https://devpost.com/hackathons/example
     * https://devpost.com/hackathons/example/
     */
    const requestedUrl = parsedUrl.toString().replace(/\/$/, "");

    /**
     * -------------------------------------------------------------
     * STEP 4: Search through Devpost API pages
     * -------------------------------------------------------------
     *
     * Unlike Remote OK, Devpost provides real pagination through
     * its API.
     *
     * We therefore use the same native pagination mechanism that
     * the search() method already uses.
     *
     * We do not know the API page containing the requested
     * hackathon from the URL alone, so we progressively inspect
     * Devpost pages until:
     *
     * 1. the requested URL is found,
     * 2. Devpost tells us there are no more pages, or
     * 3. MAX_PAGES_PER_SEARCH is reached.
     *
     * The safety limit prevents a single getByUrl() call from
     * requesting an unbounded number of pages.
     */
    let currentPage = 1;
    let hasMorePages = true;
    let pagesFetched = 0;

    while (hasMorePages && pagesFetched < MAX_PAGES_PER_SEARCH) {
      /**
       * Construct the Devpost API URL using the provider's
       * native pagination format.
       */
      const apiUrl = `${DEVPOST_API_URL}?page=${currentPage}`;

      /**
       * Request the current page from Devpost.
       */
      const response = await fetch(apiUrl);

      /**
       * Do not attempt to parse an unsuccessful HTTP response.
       *
       * An API failure should be surfaced to the caller in the
       * same way as search(), rather than being mistaken for
       * "hackathon not found".
       */
      if (!response.ok) {
        throw new Error(
          `Devpost API request failed: ${response.status} ${response.statusText}`,
        );
      }

      /**
       * Parse the structured Devpost API response.
       */
      const data = (await response.json()) as DevpostApiResponse;

      /**
       * Devpost places hackathons inside the hackathons array.
       *
       * If the API returns no hackathons, there is nothing more
       * to search.
       */
      const rawHackathons = data.hackathons ?? [];

      if (rawHackathons.length === 0) {
        hasMorePages = false;
        break;
      }

      /**
       * -----------------------------------------------------------
       * STEP 5: Find the requested hackathon
       * -----------------------------------------------------------
       *
       * We first validate the raw records using the same defensive
       * type guard used by search().
       *
       * This keeps malformed external API records from entering
       * Route's normalized domain model.
       */
      const hackathon = rawHackathons
        .filter(isDevpostHackathon)
        .find((candidate) => {
          /**
           * Devpost's API gives us the canonical URL of each
           * hackathon.
           *
           * Normalize the API URL in the same way as the
           * requested URL so that a trailing slash does not
           * cause a false mismatch.
           */
          const candidateUrl = candidate.url.trim().replace(/\/$/, "");

          return candidateUrl === requestedUrl;
        });

      /**
       * If we found the requested hackathon, normalize it using
       * the exact same normalization function used by search().
       *
       * This is important because Route should produce the same
       * Opportunity shape regardless of whether an opportunity
       * came from search() or getByUrl().
       */
      if (hackathon) {
        return normalizeHackathon(hackathon);
      }

      /**
       * -----------------------------------------------------------
       * STEP 6: Determine whether another API page exists
       * -----------------------------------------------------------
       *
       * Devpost normally provides:
       *
       * meta.total_count
       * meta.per_page
       *
       * These allow us to calculate the last available page.
       */
      const totalCount = data.meta?.total_count;

      const pageSize = data.meta?.per_page ?? DEFAULT_PAGE_SIZE;

      if (typeof totalCount === "number") {
        const lastPage = Math.ceil(totalCount / pageSize);

        hasMorePages = currentPage < lastPage;
      } else {
        /**
         * If pagination metadata is unavailable,
         * fall back to the same conservative behavior
         * used by search().
         *
         * A page that is full may indicate that another
         * page exists.
         */
        hasMorePages = rawHackathons.length >= pageSize;
      }

      /**
       * Move to the next Devpost page.
       */
      currentPage += 1;

      /**
       * Track the number of pages requested so the safety
       * limit can be enforced.
       */
      pagesFetched += 1;
    }

    /**
     * The requested hackathon was not found within the pages
     * we were willing to inspect.
     *
     * Returning null allows the service layer to distinguish
     * "not found" from a successful retrieval.
     */
    return null;
  }
}
