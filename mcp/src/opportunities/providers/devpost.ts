import type { Opportunity } from "../types.js";

import type { OpportunityProvider, OpportunitySearchParams } from "./types.js";

/**
 * Devpost exposes a structured JSON endpoint that powers its
 * hackathon listing.
 *
 * We use this endpoint instead of scraping the public HTML page.
 *
 * This is important because the normal Devpost page can return
 * an AWS WAF challenge when requested from a plain Node.js
 * fetch() call.
 */
const DEVPOST_API_URL = "https://devpost.com/api/hackathons";

/**
 * Devpost currently returns a small number of hackathons per
 * API page.
 *
 * Route does NOT expose this pagination to the AI client.
 *
 * Pagination is an internal provider concern.
 */
const DEFAULT_PAGE_SIZE = 9;

/**
 * Safety limit for a single search.
 *
 * This prevents a bad request or an unusually selective keyword
 * from causing Route to request an unbounded number of Devpost
 * pages.
 *
 * This is intentionally an internal implementation detail.
 *
 * We can tune this later after measuring real-world latency.
 */
const MAX_PAGES_PER_SEARCH = 10;

/**
 * Represents a theme/category returned by Devpost.
 */
interface DevpostTheme {
  name?: string;
}

/**
 * Represents the prize-count information returned by Devpost.
 */
interface DevpostPrizeCounts {
  cash?: number;
  other?: number;
}

/**
 * Represents a single hackathon returned by the Devpost API.
 *
 * We intentionally model only the fields Route currently needs.
 *
 * The API may contain additional fields. Route does not need to
 * mirror the entire Devpost response.
 */
interface DevpostHackathon {
  id: number | string;
  title?: string;
  displayed_location?: {
    location?: string;
  };
  open_state?: string;
  url?: string;
  time_left_to_submission?: string;
  submission_period_dates?: string;
  themes?: DevpostTheme[];
  prize_amount?: string;
  prizes_counts?: DevpostPrizeCounts;
  registrations_count?: number;
  organization_name?: string;
  winners_announced?: boolean;
  submission_gallery_url?: string;
  start_a_submission_url?: string;
  invite_only?: boolean;
  eligibility_requirement_invite_only_description?: string;
  managed_by_devpost_badge?: boolean;
}

/**
 * Represents the pagination metadata returned by Devpost.
 */
interface DevpostMeta {
  /**
   * Total number of hackathons matching the API request.
   */
  total_count?: number;

  /**
   * Number of records returned per API page.
   */
  per_page?: number;
}

/**
 * Represents the top-level Devpost API response.
 */
interface DevpostHackathonsResponse {
  hackathons?: unknown;
  meta?: DevpostMeta;
}

/**
 * Runtime guard for a Devpost hackathon.
 *
 * The response comes from an external service, so TypeScript
 * types alone are not enough.
 *
 * We first receive the data as unknown and verify that it has
 * the basic structure we need before treating it as a
 * DevpostHackathon.
 */
function isDevpostHackathon(value: unknown): value is DevpostHackathon {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  /**
   * A Devpost record must have an ID.
   */
  if (typeof candidate.id !== "number" && typeof candidate.id !== "string") {
    return false;
  }

  /**
   * A title is required because Route cannot expose a useful
   * opportunity without one.
   */
  if (typeof candidate.title !== "string") {
    return false;
  }

  return true;
}

/**
 * Removes HTML markup from Devpost's prize_amount field.
 *
 * Devpost can return values such as:
 *
 * "$<span data-currency-value>740,000</span>"
 *
 * Route should not expose that HTML as part of its normalized
 * opportunity data.
 */
function cleanPrizeAmount(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return (
    value
      /**
       * Remove HTML tags.
       */
      .replace(/<[^>]*>/g, "")

      /**
       * Decode a few common HTML entities that can appear in
       * text returned by web APIs.
       */
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

      /**
       * Remove unnecessary whitespace.
       */
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Normalizes one Devpost hackathon into Route's common
 * Opportunity structure.
 *
 * The rest of Route should never need to understand Devpost's
 * raw response shape.
 */
function normalizeDevpostHackathon(
  hackathon: DevpostHackathon,
): Opportunity | null {
  /**
   * These fields are essential for a useful Route opportunity.
   */
  if (!hackathon.title || !hackathon.url) {
    return null;
  }

  /**
   * Devpost exposes the displayed location separately.
   */
  const location = hackathon.displayed_location?.location;

  /**
   * Devpost commonly represents online hackathons with an
   * "Online" location.
   *
   * This is intentionally simple for now. We can make remote
   * detection more robust later if Devpost introduces more
   * location formats.
   */
  const remote =
    typeof location === "string" && location.toLowerCase().includes("online");

  /**
   * Convert the themes into simple strings.
   */
  const themes = Array.isArray(hackathon.themes)
    ? hackathon.themes
        .map((theme) => theme.name)
        .filter((theme): theme is string => typeof theme === "string")
    : [];

  /**
   * Devpost's listing response does not currently give us a
   * complete long-form description.
   *
   * Rather than inventing one, we create a short factual
   * description from information that Devpost actually gives us.
   */
  const descriptionParts = [
    hackathon.title,
    hackathon.organization_name
      ? `hosted by ${hackathon.organization_name}`
      : undefined,
    themes.length > 0 ? `themes: ${themes.join(", ")}` : undefined,
  ].filter(Boolean);

  const description = descriptionParts.join(". ") + ".";

  /**
   * Use a stable provider-prefixed ID.
   *
   * Prefixing the ID prevents collisions if another provider
   * happens to use the same numeric ID.
   */
  const id = `devpost:${String(hackathon.id)}`;

  return {
    id,

    title: hackathon.title,

    type: "hackathon",

    organization: hackathon.organization_name ?? "Unknown organization",

    description,

    url: hackathon.url,

    source: "devpost",

    /**
     * This identifies the API endpoint from which the data
     * originated.
     */
    sourceUrl: DEVPOST_API_URL,

    location,

    remote,

    /**
     * Devpost currently gives us the submission period as a
     * human-readable string.
     *
     * We keep it here until Route has a more structured
     * deadline model.
     */
    deadline: hackathon.submission_period_dates,

    /**
     * Clean Devpost's HTML prize representation before exposing
     * it through Route.
     */
    prize: cleanPrizeAmount(hackathon.prize_amount),

    /**
     * Source-specific information stays inside metadata.
     *
     * This allows Route's common Opportunity interface to stay
     * clean while preserving useful Devpost information for
     * get_opportunity and future features.
     */
    metadata: {
      themes,

      /**
       * Devpost calls this "registrations_count".
       *
       * We deliberately preserve that meaning instead of calling
       * it participants, because registrations are not necessarily
       * the same thing as submissions or participants.
       */
      registrations: hackathon.registrations_count,

      cashPrizes: hackathon.prizes_counts?.cash,

      otherPrizes: hackathon.prizes_counts?.other,

      submissionPeriod: hackathon.submission_period_dates,

      timeLeft: hackathon.time_left_to_submission,

      openState: hackathon.open_state,

      winnersAnnounced: hackathon.winners_announced,

      featured: undefined,

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
 * Searches the Devpost API.
 *
 * The provider is responsible for:
 *
 * 1. Fetching Devpost pages.
 * 2. Filtering the raw results.
 * 3. Continuing to later pages when necessary.
 * 4. Normalizing matching records.
 * 5. Returning the requested number of matches.
 *
 * The caller does NOT need to understand Devpost pagination.
 */
export class DevpostProvider implements OpportunityProvider {
  /**
   * Provider identifier used by Route.
   */
  readonly name = "devpost";

  /**
   * Devpost currently provides hackathons.
   */
  readonly supportedTypes = ["hackathon"] as const;

  /**
   * Search Devpost for hackathons.
   */
  async search(params: OpportunitySearchParams): Promise<Opportunity[]> {
    /**
     * Devpost only supports hackathons.
     *
     * If another opportunity type is requested, this provider
     * should simply return no results.
     */
    if (params.type && params.type !== "hackathon") {
      return [];
    }

    /**
     * Default to 10 results.
     *
     * The AI can explicitly request a different number.
     */
    const requestedLimit = params.limit ?? 10;

    /**
     * Protect the provider from invalid limits.
     *
     * A value below 1 cannot produce useful search results.
     */
    if (requestedLimit < 1) {
      return [];
    }

    /**
     * Normalize the keyword once so that every record can be
     * compared against the same value.
     */
    const keyword = params.keyword?.trim().toLowerCase();

    /**
     * This array contains only opportunities that actually
     * match the caller's filters.
     */
    const matches: Opportunity[] = [];

    /**
     * Keep track of the current Devpost API page.
     *
     * This number never leaves this provider.
     */
    let page = 1;

    /**
     * Keep fetching pages until one of the following happens:
     *
     * - We have enough matching opportunities.
     * - Devpost has no more pages.
     * - The safety page limit is reached.
     */
    while (matches.length < requestedLimit && page <= MAX_PAGES_PER_SEARCH) {
      /**
       * Construct the Devpost API URL.
       *
       * URLSearchParams keeps query-string construction safe
       * and readable.
       */
      const url = new URL(DEVPOST_API_URL);

      url.searchParams.set("page", String(page));

      /**
       * Request the current Devpost page.
       */
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",

          /**
           * Identify Route when making the request.
           */
          "User-Agent": "Route-MCP/0.1.0",
        },
      });

      /**
       * Never silently continue when Devpost returns an error.
       */
      if (!response.ok) {
        throw new Error(
          `Devpost API request failed: ${response.status} ${response.statusText}`,
        );
      }

      /**
       * Treat external JSON as unknown until we inspect it.
       */
      const rawData: unknown = await response.json();

      /**
       * Verify that the response has the expected top-level
       * object structure.
       */
      if (typeof rawData !== "object" || rawData === null) {
        throw new Error("Devpost API returned an unexpected response.");
      }

      const data = rawData as DevpostHackathonsResponse;

      /**
       * Devpost should provide an array of hackathons.
       *
       * If it doesn't, stop rather than trying to process
       * malformed data.
       */
      if (!Array.isArray(data.hackathons)) {
        throw new Error(
          "Devpost API response does not contain a hackathons array.",
        );
      }

      /**
       * Convert only valid Devpost records into our typed
       * representation.
       */
      const hackathons = data.hackathons.filter(isDevpostHackathon);

      /**
       * Normalize the current page.
       */
      for (const hackathon of hackathons) {
        const opportunity = normalizeDevpostHackathon(hackathon);

        /**
         * Ignore malformed records that cannot be normalized.
         */
        if (!opportunity) {
          continue;
        }

        /**
         * -------------------------------
         * Keyword filtering
         * -------------------------------
         *
         * Search across the fields that actually help describe
         * what the hackathon is about.
         */
        if (keyword) {
          const searchableText = [
            opportunity.title,

            opportunity.organization,

            opportunity.description,

            /**
             * Themes are already included in metadata by the
             * normalization step.
             */
            ...(Array.isArray(opportunity.metadata?.themes)
              ? opportunity.metadata.themes
              : []),
          ]
            .filter((value): value is string => typeof value === "string")
            .join(" ")
            .toLowerCase();

          /**
           * Skip this opportunity if the requested keyword does
           * not appear in its searchable content.
           */
          if (!searchableText.includes(keyword)) {
            continue;
          }
        }

        /**
         * -------------------------------
         * Remote filtering
         * -------------------------------
         */
        if (params.remote === true && opportunity.remote !== true) {
          continue;
        }

        /**
         * This opportunity passed all filters, so add it to the
         * result set.
         */
        matches.push(opportunity);

        /**
         * Stop processing the current page as soon as we have
         * enough results.
         *
         * There is no reason to process or fetch additional
         * records once the requested limit has been satisfied.
         */
        if (matches.length >= requestedLimit) {
          break;
        }
      }

      /**
       * If we already have enough matches, the search is complete.
       */
      if (matches.length >= requestedLimit) {
        break;
      }

      /**
       * -------------------------------
       * Pagination decision
       * -------------------------------
       *
       * We now determine whether Devpost has another page.
       *
       * Example:
       *
       * total_count = 13913
       * per_page    = 9
       *
       * means there are many more records available.
       */
      const totalCount =
        typeof data.meta?.total_count === "number"
          ? data.meta.total_count
          : undefined;

      const perPage =
        typeof data.meta?.per_page === "number"
          ? data.meta.per_page
          : DEFAULT_PAGE_SIZE;

      /**
       * If the current page contains fewer records than the
       * expected page size, it is almost certainly the final page.
       */
      const isLastPageBySize = hackathons.length < perPage;

      /**
       * If metadata tells us the total number of records, we can
       * determine whether another page exists mathematically.
       */
      const processedRecords = page * perPage;

      const isLastPageByCount =
        typeof totalCount === "number" && processedRecords >= totalCount;

      /**
       * Stop when Devpost indicates there are no more pages.
       */
      if (isLastPageBySize || isLastPageByCount) {
        break;
      }

      /**
       * Move to the next Devpost page.
       */
      page += 1;
    }

    /**
     * Return only the number of results requested by the caller.
     *
     * The slicing is a final defensive measure in case multiple
     * records were added before the limit check stopped processing.
     */
    return matches.slice(0, requestedLimit);
  }
}
