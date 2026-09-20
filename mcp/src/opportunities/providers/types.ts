import type { Opportunity, OpportunityType } from "../types.js";

/**
 * Parameters that can be used by any opportunity provider
 * when searching for opportunities.
 *
 * The important distinction here is that `limit` represents
 * the number of MATCHING opportunities we want back.
 *
 * It does NOT represent how many records a provider should
 * fetch from its API.
 *
 * For example:
 *
 *   limit: 20
 *
 * means:
 *
 *   "Return up to 20 opportunities that match these filters."
 *
 * A provider may therefore need to fetch multiple API pages
 * internally to find those 20 matches.
 */
export interface OpportunitySearchParams {
  /**
   * Optional keyword describing what the user is looking for.
   *
   * Providers decide which relevant fields to search.
   * For Devpost, this can include the title, organization,
   * description, and themes.
   */
  keyword?: string;

  /**
   * Optional opportunity type.
   *
   * This allows the provider layer to reject requests for
   * opportunity types that the provider does not support.
   */
  type?: OpportunityType;

  /**
   * Optional remote/online filter.
   *
   * When true, the provider should return only opportunities
   * that can be participated in remotely/online.
   */
  remote?: boolean;

  /**
   * Maximum number of MATCHING opportunities to return.
   *
   * This is intentionally different from provider pagination.
   * Provider-specific page numbers should remain an internal
   * implementation detail.
   */
  limit?: number;
}

/**
 * Common contract that every Route opportunity provider must
 * implement.
 *
 * The rest of Route should interact with providers through this
 * interface rather than knowing how Remote OK, Devpost, or any
 * future provider works internally.
 */
export interface OpportunityProvider {
  /**
   * Human-readable/internal identifier for the provider.
   *
   * Examples:
   *   "remoteok"
   *   "devpost"
   */
  readonly name: string;

  /**
   * Opportunity types supported by this provider.
   *
   * Remote OK currently supports:
   *   ["job"]
   *
   * Devpost currently supports:
   *   ["hackathon"]
   */
  readonly supportedTypes: readonly OpportunityType[];

  /**
   * Search the provider and return normalized Route opportunities.
   *
   * Provider-specific details such as API pagination, response
   * parsing, filtering, and normalization stay inside the provider.
   */
  search(params: OpportunitySearchParams): Promise<Opportunity[]>;
}
