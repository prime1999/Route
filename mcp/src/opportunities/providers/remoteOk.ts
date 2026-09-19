/**
 * Remote OK Opportunity Provider
 * ==============================
 *
 * This provider is responsible for retrieving job opportunities
 * from Remote OK and converting them into Route's normalized
 * Opportunity format.
 *
 * The important architectural rule here is:
 *
 *     Remote OK format
 *           ↓
 *     RemoteOkProvider
 *           ↓
 *     Route Opportunity[]
 *
 * Nothing outside this provider should need to understand the
 * structure of Remote OK's response.
 *
 * This keeps the MCP tools provider-agnostic.
 */

import type { Opportunity } from "../types.js";

import type { OpportunityProvider, OpportunitySearchParams } from "./types.js";

/**
 * Remote OK exposes a public JSON feed at this endpoint.
 *
 * We deliberately keep the URL inside the provider instead of
 * putting it inside an MCP tool.
 *
 * If Remote OK changes its endpoint in the future, only this
 * provider should need to change.
 */
const REMOTE_OK_API_URL = "https://remoteok.com/api";

/**
 * Remote OK job response.
 *
 * Remote OK returns more fields than Route currently needs.
 *
 * We therefore define only the fields that Route currently
 * consumes.
 *
 * The index signature allows additional fields returned by
 * Remote OK without forcing us to model every single field.
 */
interface RemoteOkJob {
  /**
   * Remote OK's unique identifier for the job.
   */
  id?: string | number;

  /**
   * Job title.
   */
  position?: string;

  /**
   * Company name.
   */
  company?: string;

  /**
   * Job description, generally containing HTML.
   */
  description?: string;

  /**
   * Tags associated with the job.
   */
  tags?: string[];

  /**
   * Location information.
   */
  location?: string;

  /**
   * Canonical URL for the job.
   */
  url?: string;

  /**
   * Alternative URL field used by some Remote OK responses.
   */
  apply_url?: string;

  /**
   * Indicates whether the job is remote.
   */
  remote?: boolean;

  /**
   * Allows additional Remote OK fields that we don't currently
   * need to model explicitly.
   */
  [key: string]: unknown;
}

/**
 * Remote OK returns a small disclaimer/metadata object as part
 * of the response in addition to job objects.
 *
 * We therefore need to distinguish actual jobs from metadata.
 *
 * A simple type guard lets us safely identify objects that look
 * like actual job listings.
 */
function isRemoteOkJob(value: unknown): value is RemoteOkJob {
  /**
   * First make sure the value is an object and not null.
   */
  if (typeof value !== "object" || value === null) {
    return false;
  }

  /**
   * Convert the unknown object into a record so we can inspect
   * individual fields safely.
   */
  const record = value as Record<string, unknown>;

  /**
   * A real Remote OK job should have at least a position or
   * company field.
   *
   * This prevents metadata objects from being treated as jobs.
   */
  return (
    typeof record.position === "string" || typeof record.company === "string"
  );
}

/**
 * Convert a Remote OK job into Route's normalized Opportunity
 * structure.
 *
 * This is the most important responsibility of the provider.
 *
 * Remote OK calls the company "company" and the job title
 * "position".
 *
 * Route doesn't care about those source-specific names.
 *
 * Route uses:
 *
 *     organization
 *     title
 */
function normalizeRemoteOkJob(job: RemoteOkJob): Opportunity | null {
  /**
   * A job without a title or URL isn't useful to an AI agent
   * or a user.
   *
   * Instead of returning malformed data, we skip it.
   */
  if (!job.position || !job.url) {
    return null;
  }

  /**
   * Remote OK sometimes provides an apply URL separately from
   * the listing URL.
   *
   * For the initial Route model, the canonical opportunity URL
   * is the listing URL.
   *
   * We preserve the source URL so the provider can be traced.
   */
  return {
    /**
     * Prefixing the source ID gives us a predictable and
     * provider-scoped identifier.
     *
     * Example:
     *
     *     remoteok-123456
     */
    id: `remoteok-${String(job.id ?? job.url)}`,

    /**
     * Remote OK calls this field "position".
     */
    title: job.position,

    /**
     * This provider only returns jobs.
     */
    type: "job",

    /**
     * Remote OK calls the organization/company field "company".
     */
    organization: job.company ?? "Unknown organization",

    /**
     * The description can be absent from some listings.
     *
     * We use an empty string rather than making the core
     * Opportunity field optional.
     */
    description: job.description ?? "",

    /**
     * Canonical Remote OK listing URL.
     */
    url: job.url,

    /**
     * Provider identifier used throughout Route.
     */
    source: "remoteok",

    /**
     * For Remote OK, the listing URL is currently also the
     * source URL.
     */
    sourceUrl: job.url,

    /**
     * Preserve location information when available.
     */
    location: job.location,

    /**
     * Remote OK is a remote-job platform, but we still preserve
     * the actual field when the source provides it.
     */
    remote: job.remote ?? true,

    /**
     * Tags are useful for future filtering and matching.
     *
     * We keep them inside metadata rather than polluting the
     * core Opportunity interface with provider-specific fields.
     */
    metadata: {
      tags: job.tags ?? [],

      /**
       * Preserve the provider's application URL when available.
       * This is useful later when Route supports an "act" flow.
       */
      applyUrl: job.apply_url,
    },
  };
}

/**
 * Remote OK provider implementation.
 *
 * This class satisfies the OpportunityProvider interface,
 * meaning Route can treat it exactly like any future provider.
 */
export class RemoteOkProvider implements OpportunityProvider {
  /**
   * Provider identifier.
   *
   * This eventually appears in Opportunity.source.
   */
  readonly name = "remoteok";

  /**
   * Remote OK currently provides jobs for our purposes.
   */
  readonly supportedTypes = ["job"] as const;

  /**
   * Search Remote OK for jobs.
   *
   * The provider receives generic Route search parameters
   * rather than Remote OK-specific arguments.
   */
  async search(params: OpportunitySearchParams): Promise<Opportunity[]> {
    /**
     * Remote OK only provides jobs.
     *
     * If Route asks this provider for hackathons, there is
     * nothing for this provider to return.
     */
    if (params.type && params.type !== "job") {
      return [];
    }

    /**
     * Fetch the public Remote OK JSON feed.
     *
     * Native fetch is used because Node.js 22 includes a
     * built-in fetch implementation.
     */
    const response = await fetch(REMOTE_OK_API_URL, {
      headers: {
        /**
         * Identify Route politely to the upstream service.
         */
        "User-Agent": "Route-MCP/0.1.0",
      },
    });

    /**
     * A non-success HTTP status means we should not attempt
     * to parse the response as a valid job feed.
     */
    if (!response.ok) {
      throw new Error(`Remote OK request failed with HTTP ${response.status}`);
    }

    /**
     * Parse the JSON response.
     *
     * The result is intentionally treated as unknown because
     * external data cannot be trusted merely because we expect
     * a particular structure.
     */
    const data: unknown = await response.json();

    /**
     * Remote OK returns an array containing job listings and
     * metadata.
     */
    if (!Array.isArray(data)) {
      throw new Error("Remote OK returned an unexpected response format.");
    }

    /**
     * Convert only actual job objects into Route opportunities.
     */
    const opportunities = data
      .filter(isRemoteOkJob)
      .map(normalizeRemoteOkJob)
      .filter(
        (opportunity): opportunity is Opportunity => opportunity !== null,
      );

    /**
     * Apply keyword filtering locally.
     *
     * We do this after fetching because the public Remote OK
     * feed gives us the complete job list.
     *
     * Later, this can be optimized if Remote OK provides a
     * more efficient server-side filtering mechanism.
     */
    const filtered = params.keyword
      ? opportunities.filter((opportunity) => {
          /**
           * Combine the most useful searchable fields.
           */
          const searchableText = [
            opportunity.title,
            opportunity.organization,
            opportunity.description,
            ...(Array.isArray(opportunity.metadata?.tags)
              ? opportunity.metadata.tags
              : []),
          ]
            .join(" ")
            .toLowerCase();

          /**
           * Perform a simple case-insensitive substring
           * search for the requested keyword.
           */
          return searchableText.includes(params.keyword!.toLowerCase());
        })
      : opportunities;

    /**
     * Apply the remote filter when explicitly requested.
     *
     * We only filter when `remote` is true.
     *
     * If the value is undefined, we leave the provider's
     * results unchanged.
     */
    const remoteFiltered =
      params.remote === true
        ? filtered.filter((opportunity) => opportunity.remote === true)
        : filtered;

    /**
     * Return normalized Route opportunities.
     *
     * At this point, the rest of Route no longer needs to know
     * anything about Remote OK's response format.
     */
    return remoteFiltered;
  }
}
