import type { Opportunity, OpportunityType } from "../types.js";

/**
 * Represents the opportunity types that a provider search can target.
 *
 * "all" is a Route-level search concept. Individual providers still
 * declare the specific opportunity types they support through
 * `supportedTypes`.
 */
export type OpportunitySearchType = OpportunityType | "all";

/**
 * Parameters accepted by an opportunity provider during a search.
 *
 * Providers receive these parameters from the Provider Manager, but
 * each provider is responsible for interpreting them according to
 * the semantics of its own data source.
 */
export interface OpportunitySearchParams {
  /**
   * Optional keyword used to filter opportunities.
   *
   * The keyword is intentionally free-form. Route does not restrict
   * users to a predefined list of skills or interests.
   */
  keyword?: string;

  /**
   * Optional opportunity type to search for.
   *
   * "all" is handled by Route's provider/search infrastructure rather
   * than representing a native provider type.
   */
  type?: OpportunitySearchType;

  /**
   * Optional remote-work/location filter.
   *
   * The provider decides how this maps to its source's own data model.
   */
  remote?: boolean;

  /**
   * Maximum number of opportunities the provider should return
   * for this search request.
   */
  limit?: number;

  /**
   * Opaque provider-specific continuation cursor.
   *
   * Route passes this back to the same provider on subsequent pages.
   * The provider owns the meaning and format of this cursor.
   */
  cursor?: string;
}

/**
 * The result returned by an individual opportunity provider.
 */
export interface OpportunityProviderResult {
  /**
   * Normalized opportunities returned by the provider.
   */
  opportunities: Opportunity[];

  /**
   * Provider-specific cursor for continuing the search.
   *
   * When omitted, the provider has no more results to return.
   */
  nextCursor?: string;
}

/**
 * Contract every Route opportunity provider must implement.
 *
 * Providers are responsible for translating their external source
 * into Route's normalized Opportunity model.
 */
export interface OpportunityProvider {
  /**
   * Unique provider name used internally by Route.
   *
   * This name is also used when storing provider-specific pagination
   * state inside Route's opaque search cursor.
   */
  readonly name: string;

  /**
   * Opportunity types supported by this provider.
   */
  readonly supportedTypes: readonly OpportunityType[];

  /**
   * Determines whether this provider owns the supplied URL.
   *
   * This method should only answer the ownership question.
   * It should NOT perform network requests or retrieve the resource.
   *
   * Keeping URL ownership separate from retrieval allows the
   * Provider Manager to resolve the correct provider before calling
   * getByUrl().
   */
  canHandleUrl(url: string): boolean;

  /**
   * Searches the provider's external source and normalizes the
   * returned results into Route opportunities.
   */
  search(params: OpportunitySearchParams): Promise<OpportunityProviderResult>;

  /**
   * Retrieves a single opportunity directly from its source URL.
   *
   * The provider is responsible for validating the URL according
   * to its own source rules, retrieving the resource, and
   * normalizing it into Route's Opportunity model.
   *
   * Returning null means the provider could not resolve the
   * requested opportunity.
   */
  getByUrl(url: string): Promise<Opportunity | null>;
}
