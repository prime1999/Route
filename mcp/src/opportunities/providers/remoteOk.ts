import type { Opportunity } from "../types.js";

import type {
  OpportunityProvider,
  OpportunityProviderResult,
  OpportunitySearchParams,
} from "./types.js";

/**
 * Remote OK's public jobs API.
 *
 * Remote OK exposes its jobs through a JSON endpoint, which
 * means Route does not need to scrape the website.
 */
const REMOTE_OK_API_URL = "https://remoteok.com/api";

/**
 * Shape of a raw job returned by Remote OK.
 *
 * We only describe the fields Route currently needs.
 */
interface RemoteOkJob {
  id?: string | number;

  slug?: string;

  position?: string;

  company?: string;

  description?: string;

  tags?: string[];

  location?: string;

  url?: string;

  apply_url?: string;

  date?: string;

  epoch?: number;

  logo?: string;

  salary_min?: number;

  salary_max?: number;
}

/**
 * Remote OK's API can contain objects that are not jobs.
 *
 * This type guard makes sure we only process objects that
 * actually look like job records.
 */
function isRemoteOkJob(value: unknown): value is RemoteOkJob {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const job = value as Record<string, unknown>;

  return typeof job.position === "string" && typeof job.company === "string";
}

/**
 * Normalize a Remote OK job into Route's common
 * Opportunity model.
 */
function normalizeJob(job: RemoteOkJob): Opportunity {
  /**
   * Remote OK normally provides a direct URL for the job.
   *
   * If it doesn't, construct a fallback URL from the slug.
   */
  const url =
    job.url ??
    (job.slug
      ? `https://remoteok.com/remote-jobs/${job.slug}`
      : "https://remoteok.com");

  /**
   * Remote OK jobs are specifically sourced from a remote-job
   * platform, so Route can safely mark them as remote.
   */
  return {
    id: `remoteok:${String(
      job.id ?? job.slug ?? `${job.company}-${job.position}`,
    )}`,

    title: job.position ?? "Untitled job",

    type: "job",

    organization: job.company ?? "Unknown company",

    description: job.description ?? "",

    url,

    source: "remoteok",

    sourceUrl: REMOTE_OK_API_URL,

    location: job.location,

    remote: true,

    metadata: {
      tags: job.tags ?? [],

      applyUrl: job.apply_url,

      publishedAt: job.date,

      epoch: job.epoch,

      logo: job.logo,

      salaryMin: job.salary_min,

      salaryMax: job.salary_max,
    },
  };
}

/**
 * Determines whether a normalized opportunity matches
 * the requested keyword.
 *
 * We search across:
 *
 * - title
 * - organization
 * - description
 * - tags
 *
 * This gives the AI more useful keyword matching than
 * checking only the job title.
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

    ...(Array.isArray(opportunity.metadata?.tags)
      ? opportunity.metadata.tags
      : []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedKeyword);
}

/**
 * Remote OK opportunity provider.
 */
export class RemoteOkProvider implements OpportunityProvider {
  readonly name = "remoteok";

  readonly supportedTypes = ["job"] as const;

  /**
   * Search Remote OK for matching jobs.
   *
   * Remote OK currently exposes a single JSON feed rather
   * than the page-based pagination used by Devpost.
   *
   * Therefore this provider:
   *
   * 1. Fetches the feed.
   * 2. Normalizes the jobs.
   * 3. Applies Route's filters.
   * 4. Returns up to the requested limit.
   *
   * There is currently no continuation cursor because the
   * Remote OK endpoint does not expose a stable pagination
   * mechanism that we can safely continue from.
   */
  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunityProviderResult> {
    /**
     * This provider only handles jobs.
     *
     * The Provider Manager normally handles provider selection,
     * but this defensive check prevents accidental direct calls
     * with an incompatible type.
     */
    if (params.type && params.type !== "job" && params.type !== "all") {
      return {
        opportunities: [],
      };
    }

    /**
     * Default provider target.
     */
    const limit =
      params.limit && params.limit > 0 ? Math.floor(params.limit) : 10;

    /**
     * Fetch the Remote OK JSON feed.
     */
    const response = await fetch(REMOTE_OK_API_URL);

    if (!response.ok) {
      throw new Error(
        `Remote OK API request failed: ${response.status} ${response.statusText}`,
      );
    }

    /**
     * Remote OK returns an array containing job records.
     */
    const data = (await response.json()) as unknown;

    /**
     * Make sure we actually received an array before
     * processing the response.
     */
    if (!Array.isArray(data)) {
      throw new Error("Remote OK API returned an unexpected response.");
    }

    /**
     * Convert valid raw jobs into Route opportunities.
     */
    const opportunities = data.filter(isRemoteOkJob).map(normalizeJob);

    /**
     * Apply the keyword filter.
     */
    const filtered = opportunities.filter((opportunity) =>
      matchesKeyword(opportunity, params.keyword),
    );

    /**
     * Remote OK jobs are already remote, but keeping the
     * remote filter here maintains the common provider contract.
     */
    const remoteFiltered =
      params.remote === true
        ? filtered.filter((opportunity) => opportunity.remote === true)
        : filtered;

    /**
     * Return only the requested number of matching jobs.
     */
    const results = remoteFiltered.slice(0, limit);

    /**
     * Remote OK currently does not provide a reliable
     * continuation cursor, so we deliberately return only
     * the opportunities.
     *
     * The Search Service will understand that there is no
     * continuation available for this provider.
     */
    return {
      opportunities: results,
    };
  }
}
