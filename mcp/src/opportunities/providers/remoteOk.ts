import type { Opportunity } from "../types.js";

import type {
  OpportunityProvider,
  OpportunityProviderResult,
  OpportunitySearchParams,
} from "./types.js";

/**
 * Remote OK's public API endpoint.
 *
 * Remote OK currently exposes its jobs through a JSON feed
 * rather than a conventional page-based API.
 */
const REMOTE_OK_API = "https://remoteok.com/api";

/**
 * Internal cursor prefix used by the Remote OK provider.
 *
 * Examples:
 *
 * remoteok:0
 * remoteok:5
 * remoteok:10
 *
 * The number represents the position within the provider's
 * filtered result set, NOT a Remote OK API page number.
 */
const CURSOR_PREFIX = "remoteok:";

/**
 * Default number of matching opportunities to return
 * when the caller does not provide a limit.
 */
const DEFAULT_LIMIT = 10;

/**
 * Remote OK opportunity provider.
 *
 * Responsibilities:
 * - fetch jobs from Remote OK
 * - filter jobs according to Route's search parameters
 * - normalize Remote OK's response into Route's Opportunity model
 * - provide position-based pagination
 *
 * Remote OK itself does not currently give us a reliable
 * pagination cursor, so Route implements continuation based
 * on the position of the matching result inside the fetched
 * dataset.
 */
export class RemoteOkProvider implements OpportunityProvider {
  /**
   * Stable identifier for this provider.
   *
   * This value is also used when storing provider-specific
   * continuation cursors inside Route's internal cursor.
   */
  readonly name = "remoteok";

  /**
   * Remote OK currently provides jobs only.
   */
  readonly supportedTypes = ["job"] as const;

  /**
   * Search Remote OK for jobs matching the supplied criteria.
   *
   * The important part of this implementation is that
   * filtering happens BEFORE pagination.
   *
   * This means `limit` represents the number of matching
   * opportunities rather than the number of raw API records
   * that we inspect.
   */
  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunityProviderResult> {
    /**
     * Determine how many matching opportunities we should
     * return for this provider.
     */
    const limit = params.limit ?? DEFAULT_LIMIT;

    /**
     * Decode our provider-specific position cursor.
     *
     * If no cursor was supplied, the search starts from
     * position zero.
     */
    const startPosition = this.decodeCursor(params.cursor);

    /**
     * Fetch the complete Remote OK feed.
     *
     * Remote OK does not currently provide a reliable
     * pagination mechanism that we can use here, so the
     * provider works from the available feed and performs
     * Route's filtering/pagination locally.
     */
    const response = await fetch(REMOTE_OK_API);

    /**
     * Stop immediately when Remote OK responds with an
     * unsuccessful HTTP status.
     */
    if (!response.ok) {
      throw new Error(
        `Remote OK request failed: ${response.status} ${response.statusText}`,
      );
    }

    /**
     * Remote OK returns a mixed JSON array.
     *
     * The feed contains job objects as well as metadata
     * entries, so we intentionally keep the value as
     * unknown until we validate the structure we need.
     */
    const data: any[] = await response.json();
    console.log("Remote OK raw data:", data.length);
    console.log("parms: ", params);

    /**
     * Convert only valid Remote OK job records into
     * Route opportunities.
     *
     * Filtering happens before pagination because the
     * cursor represents a position inside the MATCHING
     * result set.
     */
    const matchingOpportunities = this.filterAndNormalize(data, params);
    console.log("matchin opportunities:", matchingOpportunities.length);

    /**
     * Take only the requested section of the matching
     * opportunities.
     *
     * Example:
     *
     * matching results:
     * [0,1,2,3,4,5,6,7,8,9]
     *
     * startPosition = 5
     * limit = 5
     *
     * returned:
     * [5,6,7,8,9]
     */
    const opportunities = matchingOpportunities.slice(
      startPosition,
      startPosition + limit,
    );

    /**
     * Calculate the position immediately after the
     * opportunities we just returned.
     */
    const nextPosition = startPosition + opportunities.length;

    /**
     * Determine whether there are more matching
     * opportunities available.
     */
    const hasMore = nextPosition < matchingOpportunities.length;

    /**
     * Only provide a continuation cursor when another
     * request can actually return additional results.
     */
    const nextCursor = hasMore ? this.encodeCursor(nextPosition) : undefined;

    return {
      opportunities,
      nextCursor,
    };
  }

  /**
   * Decode a Remote OK provider cursor.
   *
   * Expected format:
   *
   * remoteok:5
   *
   * Returns:
   *
   * 5
   *
   * If the cursor is missing or malformed, we start from
   * position zero.
   */
  private decodeCursor(cursor?: string): number {
    /**
     * No cursor means this is the first request.
     */
    if (!cursor) {
      return 0;
    }

    /**
     * Make sure the cursor actually belongs to the
     * Remote OK provider.
     */
    if (!cursor.startsWith(CURSOR_PREFIX)) {
      return 0;
    }

    /**
     * Remove the provider prefix and convert the
     * remaining value into a number.
     */
    const position = Number(cursor.slice(CURSOR_PREFIX.length));

    /**
     * Protect the provider from invalid cursor values.
     *
     * Negative, NaN, and infinite positions are not valid.
     */
    if (!Number.isInteger(position) || position < 0) {
      return 0;
    }

    return position;
  }

  /**
   * Encode a numeric position into a Remote OK
   * provider-specific continuation cursor.
   */
  private encodeCursor(position: number): string {
    return `${CURSOR_PREFIX}${position}`;
  }

  /**
   * Filter and normalize Remote OK's raw API response.
   *
   * This method performs provider-specific filtering and
   * converts the external API representation into Route's
   * common Opportunity model.
   */
  private filterAndNormalize(
    data: unknown,
    params: OpportunitySearchParams,
  ): Opportunity[] {
    /**
     * The Remote OK response is expected to be an array.
     *
     * If the API returns something unexpected, return an
     * empty result rather than allowing unsafe data to
     * enter the rest of Route.
     */
    if (!Array.isArray(data)) {
      return [];
    }
    // console.log("First item:");
    // console.log(data[0]);

    // console.log("Second item:");
    // console.log(data[1]);

    // console.log("Third item:");
    // console.log(data[2]);
    /**
     * Remote OK includes a metadata object at the beginning
     * of the response. We only want actual job records.
     */
    const jobs = data.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item) &&
        "id" in item,
    );

    /**
     * Normalize and filter each valid Remote OK job.
     */
    return jobs
      .filter((job) => this.matchesSearch(job, params))
      .map((job) => this.normalizeJob(job));
  }

  /**
   * Determine whether a Remote OK job satisfies
   * the requested search criteria.
   *
   * Keyword matching is intentionally broad across
   * several useful job fields rather than being limited
   * to the job title.
   */
  private matchesSearch(
    job: Record<string, unknown>,
    params: OpportunitySearchParams,
  ): boolean {
    /**
     * Remote OK is a job provider.
     *
     * If the caller specifically asks for hackathons,
     * this provider should not return anything.
     */
    if (params.type && params.type !== "all" && params.type !== "job") {
      return false;
    }

    /**
     * Apply the remote filter when explicitly requested.
     *
     * Remote OK's jobs are generally remote, but we still
     * preserve the provider's explicit remote semantics
     * through the normalized job data.
     */
    if (params.remote === true && job.remote !== true) {
      return false;
    }

    /**
     * If there is no keyword, the job already satisfies
     * the remaining search criteria.
     */
    if (!params.keyword) {
      return true;
    }

    /**
     * Normalize the keyword so matching is
     * case-insensitive.
     */
    const keyword = params.keyword.toLowerCase();

    /**
     * These are the fields we currently consider useful
     * for keyword matching.
     */
    const searchableFields = [
      job.position,
      job.company,
      job.description,
      job.tags,
    ];

    /**
     * Convert searchable values into strings and check
     * whether any field contains the requested keyword.
     */
    return searchableFields.some((value) => {
      if (Array.isArray(value)) {
        return value.some((item) =>
          String(item).toLowerCase().includes(keyword),
        );
      }

      if (typeof value === "string") {
        return value.toLowerCase().includes(keyword);
      }

      return false;
    });
  }

  /**
   * Convert a Remote OK job into Route's common
   * Opportunity structure.
   */
  private normalizeJob(job: Record<string, unknown>): Opportunity {
    /**
     * Extract and normalize the tags because Remote OK
     * can represent them as an array.
     */
    const tags = Array.isArray(job.tags) ? job.tags.map(String) : [];

    /**
     * Build the normalized Route opportunity.
     *
     * Route's other layers should not need to know the
     * original Remote OK response structure.
     */
    return {
      id: `remoteok:${String(job.id)}`,

      title: String(job.position ?? ""),

      type: "job",

      organization: String(job.company ?? ""),

      description: String(job.description ?? ""),

      url: String(job.url ?? ""),

      source: "remoteok",

      sourceUrl: REMOTE_OK_API,

      remote: job.remote === true,

      metadata: {
        tags,

        applyUrl: job.apply_url,

        publishedAt: job.date,

        epoch: job.epoch,

        logo: job.logo,

        salaryMin: job.salary_min,

        salaryMax: job.salary_max,
      },
    };
  }
}
