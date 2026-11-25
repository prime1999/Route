import type { Opportunity } from "../types.js";

import type { OpportunityPreparationContext } from "../preparation/types.js";

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
 * - remoteok:0
 * - remoteok:5
 * - remoteok:10
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
   * Determines whether a URL belongs to Remote OK and represents
   * a Remote OK job page.
   *
   * This method only performs URL ownership validation.
   * It deliberately does not make a network request.
   *
   * The Provider Manager uses this method to decide which provider
   * should receive a getByUrl() request.
   */
  canHandleUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      /**
       * Route only accepts HTTPS source URLs for direct retrieval.
       *
       * This also prevents accidentally treating an arbitrary HTTP
       * resource as a trusted Remote OK opportunity source.
       */
      if (parsedUrl.protocol !== "https:") {
        return false;
      }

      /**
       * Remote OK's canonical hostname is remoteok.com.
       *
       * We intentionally require an exact hostname match rather than
       * using endsWith("remoteok.com"), because that could incorrectly
       * accept domains such as:
       *
       *     evilremoteok.com
       */
      if (parsedUrl.hostname !== "remoteok.com") {
        return false;
      }

      /**
       * Remote OK job pages use the /remote-jobs/ path.
       *
       * Requiring this path prevents unrelated Remote OK pages from
       * being treated as opportunity URLs.
       */
      return parsedUrl.pathname.startsWith("/remote-jobs/");
    } catch {
      /**
       * Invalid URLs are simply not owned by this provider.
       *
       * URL parsing errors should not escape from an ownership check.
       */
      return false;
    }
  }

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
    const data: unknown = await response.json();

    /**
     * Convert only valid Remote OK job records into
     * Route opportunities.
     *
     * Filtering happens before pagination because the
     * cursor represents a position inside the MATCHING
     * result set.
     */
    const matchingOpportunities = this.filterAndNormalize(data, params);

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
   * Retrieve one specific job directly from its Remote OK URL.
   *
   * Unlike search(), which starts from Remote OK's public JSON feed,
   * this method works directly with the individual job page.
   *
   * This is important for Route's get_opportunity flow:
   *
   * 1. search_opportunities returns a canonical opportunity URL.
   * 2. The AI agent can later pass that URL to get_opportunity.
   * 3. The provider resolves the URL directly from Remote OK.
   * 4. The provider normalizes the page into Route's Opportunity model.
   *
   * We deliberately do not search through the entire Remote OK feed
   * to find the requested job. The URL already identifies the exact
   * external resource we want.
   *
   * @param url
   * The canonical Remote OK job URL supplied by Route.
   *
   * @returns
   * A normalized Route Opportunity when the job can be retrieved
   * successfully, or null when the URL is not a Remote OK job URL,
   * the page cannot be retrieved, or the expected job data cannot
   * be extracted.
   */
  async getByUrl(url: string): Promise<Opportunity | null> {
    /**
     * -------------------------------------------------------------
     * STEP 1: Parse the supplied URL
     * -------------------------------------------------------------
     *
     * URL parsing is intentionally performed before making any
     * network request.
     *
     * This prevents malformed input from reaching fetch() and gives
     * us a structured URL object that we can safely inspect.
     */
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return null;
    }

    /**
     * -------------------------------------------------------------
     * STEP 2: Verify that this provider owns the URL
     * -------------------------------------------------------------
     *
     * A provider must never blindly fetch arbitrary URLs.
     *
     * RemoteOkProvider only accepts URLs that:
     *
     * 1. use HTTPS
     * 2. belong to remoteok.com
     * 3. point to the /remote-jobs/ path
     */
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "remoteok.com" ||
      !parsedUrl.pathname.startsWith("/remote-jobs/")
    ) {
      return null;
    }

    /**
     * -------------------------------------------------------------
     * STEP 3: Retrieve the individual job page
     * -------------------------------------------------------------
     *
     * Search uses Remote OK's JSON API.
     *
     * getByUrl() is different: we already know the exact job URL,
     * so we retrieve the individual HTML page instead.
     */
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Route Opportunity MCP Server",
      },
    });

    /**
     * -------------------------------------------------------------
     * STEP 4: Handle unsuccessful HTTP responses
     * -------------------------------------------------------------
     *
     * A valid URL does not guarantee that the resource exists.
     *
     * For example:
     * - the job may have been removed
     * - Remote OK may return 404
     * - Remote OK may temporarily reject the request
     * - the server may return another HTTP error
     */
    if (!response.ok) {
      return null;
    }

    /**
     * The Remote OK job page is HTML rather than JSON.
     *
     * We therefore read the complete response as text before
     * extracting the structured JobPosting information embedded
     * inside the page.
     */
    const html = await response.text();

    /**
     * -------------------------------------------------------------
     * STEP 5: Extract the JobPosting JSON-LD
     * -------------------------------------------------------------
     *
     * Remote OK embeds structured Schema.org data in the page using:
     *
     * <script type="application/ld+json">
     *
     * There can be multiple JSON-LD blocks on the page, so we do not
     * assume that the first block is the job.
     */
    const jsonLdMatches = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );

    /**
     * We start with no JobPosting data.
     */
    let jobPosting: Record<string, any> | null = null;

    for (const match of jsonLdMatches) {
      /**
       * The first capture group contains the JSON text inside
       * the <script> element.
       */
      const json = match[1];

      if (!json) {
        continue;
      }

      try {
        const parsed = JSON.parse(json);

        /**
         * We only care about the JSON-LD object representing
         * the actual job.
         */
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed["@type"] === "JobPosting"
        ) {
          jobPosting = parsed;
          break;
        }
      } catch {
        /**
         * A malformed JSON-LD block should not prevent us from
         * checking the other JSON-LD blocks on the page.
         */
        continue;
      }
    }

    /**
     * If no JobPosting JSON-LD was found, we cannot confidently
     * construct a normalized Opportunity.
     */
    if (!jobPosting) {
      return null;
    }

    /**
     * -------------------------------------------------------------
     * STEP 6: Extract the Remote OK job ID
     * -------------------------------------------------------------
     *
     * The canonical Remote OK URL contains the job ID at the end.
     *
     * Example:
     *
     * /remote-jobs/remote-frontend-engineer-bjak-1137410
     *                                             ^^^^^^^
     */
    const jobIdMatch = parsedUrl.pathname.match(/-(\d+)\/?$/);
    const jobId = jobIdMatch?.[1];

    if (!jobId) {
      return null;
    }

    /**
     * -------------------------------------------------------------
     * STEP 7: Extract additional Remote OK metadata
     * -------------------------------------------------------------
     *
     * Remote OK also exposes useful metadata in the HTML page.
     *
     * One example is currentJobTags.
     */
    const tagsMatch = html.match(/currentJobTags\s*=\s*(\[[\s\S]*?\]);/);

    let tags: string[] = [];

    if (tagsMatch?.[1]) {
      try {
        const parsedTags = JSON.parse(tagsMatch[1]);

        if (Array.isArray(parsedTags)) {
          tags = parsedTags.map(String);
        }
      } catch {
        /**
         * Tags are supplementary metadata.
         *
         * If they cannot be parsed, we can still return the job
         * because the core JobPosting data is valid.
         */
        tags = [];
      }
    }

    /**
     * -------------------------------------------------------------
     * STEP 8: Normalize the external job into Route's model
     * -------------------------------------------------------------
     *
     * Everything returned below follows Route's common Opportunity
     * structure.
     */
    return {
      id: `remoteok:${jobId}`,

      title: String(jobPosting.title ?? ""),

      type: "job",

      organization: String(jobPosting.hiringOrganization?.name ?? ""),

      /**
       * Preserve the full job description supplied by Remote OK.
       */
      description: String(jobPosting.description ?? ""),

      url: parsedUrl.toString(),

      source: "remoteok",

      sourceUrl: REMOTE_OK_API,

      /**
       * Remote OK is a remote-job provider.
       */
      remote: true,

      metadata: {
        tags,
        publishedAt: jobPosting.datePosted,
        employmentType: jobPosting.employmentType,
        validThrough: jobPosting.validThrough,
        salary: jobPosting.baseSalary,
      },
    };
  }

  /**
   * Build preparation context for an already-resolved Remote OK job.
   *
   * Remote OK's getByUrl() already extracts the authoritative
   * JobPosting information that Route currently needs for preparation.
   *
   * We therefore organize information already present on the
   * normalized Opportunity instead of making another network request.
   *
   * This method intentionally does NOT:
   * - generate an LLM summary
   * - decide whether the user should apply
   * - determine user qualification
   * - generate personalized application advice
   *
   * Those responsibilities belong to the connected AI agent.
   */
  async getPreparationContext(
    opportunity: Opportunity,
  ): Promise<OpportunityPreparationContext> {
    /**
     * Preserve the original job description as source content.
     *
     * Route does not rewrite or summarize this content.
     */
    const sourceContent = opportunity.description
      ? [
          {
            title: opportunity.title,
            content: opportunity.description,
            url: opportunity.url,
          },
        ]
      : undefined;

    /**
     * Build dates only when the provider actually gives us
     * a useful value.
     *
     * validThrough represents the date after which the job
     * posting is no longer valid, when Remote OK provides it.
     */
    const importantDates: {
      label: string;
      value: string;
    }[] = [];

    const validThrough = opportunity.metadata?.validThrough;

    if (typeof validThrough === "string" && validThrough.length > 0) {
      importantDates.push({
        label: "Valid through",
        value: validThrough,
      });
    }

    /**
     * Employment type is useful preparation context, but it is
     * not an application requirement.
     *
     * We therefore expose it under requirements as a factual
     * source-backed item rather than inventing qualifications.
     */
    const requirements = opportunity.metadata?.employmentType
      ? [
          {
            title: "Employment type",
            description: String(opportunity.metadata.employmentType),
          },
        ]
      : undefined;

    return {
      /**
       * Keep the normalized Opportunity as the core source of truth.
       */
      opportunity,

      preparation: {
        importantDates: importantDates.length > 0 ? importantDates : undefined,

        requirements,

        /**
         * Remote OK does not currently provide reliable structured
         * eligibility information through our normalized provider data.
         *
         * Leave it undefined instead of inventing requirements.
         */
        eligibility: undefined,

        /**
         * No structured preparation constraints are currently
         * available from the Remote OK provider.
         */
        constraints: undefined,

        /**
         * Remote OK tags remain available under opportunity.metadata.
         *
         * We do not duplicate them as categories without a clear
         * source-level distinction.
         */
        categories: undefined,

        /**
         * Remote OK does not currently expose a structured submission
         * contract in this preparation model.
         *
         * If an applyUrl is available, it remains in
         * opportunity.metadata.applyUrl.
         */
        submission: undefined,
      },

      /**
       * Preserve the source description as-is so the connected
       * AI agent can reason over the actual source material.
       */
      sourceContent,

      /**
       * Record where this preparation context came from and
       * when Route retrieved it.
       */
      source: {
        provider: this.name,
        url: opportunity.url,
        retrievedAt: new Date().toISOString(),
      },
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
     * Remote OK is a remote-job provider.
     *
     * The provider itself is the source of truth for this
     * property, so no additional filtering is required here
     * when params.remote === true.
     */
    if (params.remote === true) {
      // Remote OK jobs are treated as remote by this provider.
    }

    /**
     * If there is no keyword, the job already satisfies
     * the remaining search criteria.
     */
    if (!params.keyword) {
      return true;
    }

    /**
     * Normalize the keyword so matching is case-insensitive.
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
      /**
       * Route's internal provider-scoped identity.
       */
      id: `remoteok:${String(job.id)}`,

      /**
       * Remote OK job title.
       */
      title: String(job.position ?? ""),

      /**
       * Remote OK currently provides jobs only.
       */
      type: "job",

      /**
       * Company/organization name.
       */
      organization: String(job.company ?? ""),

      /**
       * Raw job description from Remote OK.
       */
      description: String(job.description ?? ""),

      /**
       * Canonical Remote OK job URL.
       */
      url: String(job.url ?? ""),

      /**
       * Provider identifier.
       */
      source: "remoteok",

      /**
       * Remote OK API source.
       */
      sourceUrl: REMOTE_OK_API,

      /**
       * Remote OK is a remote-job provider.
       *
       * The raw search API does not reliably expose a boolean
       * `remote` property, so we normalize this at the provider
       * boundary instead of depending on the raw API shape.
       */
      remote: true,

      /**
       * Provider-specific metadata.
       */
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
