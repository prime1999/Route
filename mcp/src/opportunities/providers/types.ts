import type { Opportunity, OpportunityType } from "../types.js";

/**
 * Defines the type of search that Route supports.
 *
 * "all" is a search scope, not an actual OpportunityType.
 * It tells the provider manager to search across every
 * provider that can participate in the request.
 */
export type OpportunitySearchType = OpportunityType | "all";

/**
 * Parameters understood by the provider layer.
 *
 * These parameters are intentionally generic so that every
 * opportunity provider can implement the same interface.
 */
export interface OpportunitySearchParams {
  /**
   * Optional keyword supplied by the user/AI.
   *
   * Providers decide which fields they use for matching.
   */
  keyword?: string;

  /**
   * Restricts the search to a specific opportunity type,
   * or "all" providers when omitted/"all".
   */
  type?: OpportunitySearchType;

  /**
   * Optional remote-only filter.
   */
  remote?: boolean;

  /**
   * Maximum number of matching opportunities that
   * the provider should attempt to return.
   */
  limit?: number;

  /**
   * Provider-specific continuation cursor.
   *
   * This is used when Route needs to continue a previous
   * provider search.
   *
   * IMPORTANT:
   * This value never needs to be exposed to the MCP client.
   */
  cursor?: string;
}

/**
 * Result returned by an individual provider.
 */
export interface OpportunityProviderResult {
  /**
   * Opportunities found by this provider.
   */
  opportunities: Opportunity[];

  /**
   * Provider-specific cursor for continuing the search.
   *
   * If undefined, the provider has no continuation state
   * available.
   */
  nextCursor?: string;
}

/**
 * Contract every Route opportunity provider must implement.
 */
export interface OpportunityProvider {
  /**
   * Stable internal provider name.
   *
   * Examples:
   * - "remoteok"
   * - "devpost"
   */
  readonly name: string;

  /**
   * Opportunity types supported by this provider.
   */
  readonly supportedTypes: readonly OpportunityType[];

  /**
   * Search this provider for opportunities.
   */
  search(params: OpportunitySearchParams): Promise<OpportunityProviderResult>;
}
