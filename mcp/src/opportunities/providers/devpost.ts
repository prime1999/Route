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
}
