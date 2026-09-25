import type { Opportunity, OpportunityType } from "../types.js";

/**
 * The types of opportunities that a provider can search for.
 *
 * "all" is intentionally not included here because "all" is a
 * Route-level search concept. Individual providers only need to
 * understand the opportunity types they actually support.
 */
export type OpportunitySearchType = OpportunityType | "all";

/**
 * Parameters accepted by the provider search operation.
 *
 * The Provider Manager passes these parameters down to individual
 * providers after deciding which providers should participate.
 */
export interface OpportunitySearchParams {
  keyword?: string;
  type?: OpportunitySearchType;
  remote?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * Standardized result returned by a provider search operation.
 *
 * Providers own their own pagination mechanism and expose only
 * an opaque continuation cursor to the Provider Manager.
 */
export interface OpportunityProviderResult {
  opportunities: Opportunity[];

  /**
   * Provider-specific continuation state.
   *
   * Route does not interpret this value. It simply stores it inside
   * the Route-level opaque cursor and passes it back to the provider
   * on the next request.
   */
  nextCursor?: string;
}

/**
 * Contract that every Route opportunity provider must implement.
 *
 * Providers are responsible for translating their external source
 * into Route's common Opportunity model.
 */
export interface OpportunityProvider {
  /**
   * Provider identifier used internally by Route.
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
   * Search the provider for opportunities.
   */
  search(params: OpportunitySearchParams): Promise<OpportunityProviderResult>;

  /**
   * Retrieve one specific opportunity using its canonical external URL.
   *
   * The URL comes directly from the normalized Opportunity returned
   * by Route's search operation.
   *
   * Providers should retrieve the specific resource represented by
   * the URL rather than downloading an entire provider dataset and
   * scanning it for a matching internal ID.
   *
   * Returning null means the provider could not resolve the URL
   * into a current Opportunity.
   */
  getByUrl(url: string): Promise<Opportunity | null>;
}
