import type { Opportunity, OpportunityType } from "../types.js";

/**
 * Defines the scope of an opportunity search.
 *
 * `OpportunityType` represents an actual opportunity domain:
 * - job
 * - hackathon
 *
 * `"all"` is different. It means:
 * "Search across every provider that can satisfy this request."
 *
 * We deliberately keep `"all"` out of OpportunityType because
 * "all" is a search scope, not an opportunity itself.
 */
export type OpportunitySearchType = OpportunityType | "all";

/**
 * Parameters accepted by an opportunity provider.
 *
 * These are the search instructions that Route passes down
 * to individual providers.
 */
export interface OpportunitySearchParams {
  /**
   * Optional keyword supplied by the AI.
   *
   * Example:
   * "AI"
   * "typescript"
   * "fintech"
   */
  keyword?: string;

  /**
   * Restricts the search to a specific opportunity type,
   * or allows searching across all supported types.
   */
  type?: OpportunitySearchType;

  /**
   * If true, only remote opportunities should be returned.
   */
  remote?: boolean;

  /**
   * Number of matching opportunities the provider should
   * try to return.
   *
   * This is NOT the provider's page size.
   *
   * A provider may need to fetch several pages internally
   * to satisfy this number.
   */
  limit?: number;

  /**
   * Optional continuation cursor.
   *
   * When Route asks for more results, this tells the provider
   * where the previous search stopped.
   *
   * The provider owns the meaning of this cursor.
   */
  cursor?: string;
}

/**
 * Result returned by an individual opportunity provider.
 *
 * A provider returns:
 * - the opportunities it found
 * - optionally, a cursor that allows the next search to continue
 *
 * The cursor is opaque to the rest of the application.
 */
export interface OpportunityProviderResult {
  /**
   * Normalized opportunities returned by the provider.
   */
  opportunities: Opportunity[];

  /**
   * Cursor for continuing the search.
   *
   * `undefined` means there are no more results or the provider
   * cannot continue the current search.
   */
  nextCursor?: string;
}

/**
 * Common interface that every opportunity provider must implement.
 *
 * This allows Route to treat Remote OK, Devpost, and future
 * providers uniformly.
 */
export interface OpportunityProvider {
  /**
   * Human-readable provider name.
   *
   * Examples:
   * "remoteok"
   * "devpost"
   */
  readonly name: string;

  /**
   * Opportunity types supported by this provider.
   */
  readonly supportedTypes: readonly OpportunityType[];

  /**
   * Search the provider for opportunities matching the supplied
   * parameters.
   *
   * The provider is responsible for:
   * - communicating with the external source
   * - handling source-specific pagination
   * - filtering source results
   * - normalizing results into Route's Opportunity model
   * - creating its own continuation cursor
   */
  search(params: OpportunitySearchParams): Promise<OpportunityProviderResult>;
}
