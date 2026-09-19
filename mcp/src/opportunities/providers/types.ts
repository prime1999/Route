/**
 * Route Opportunity Provider Interface
 * =====================================
 *
 * Route will eventually retrieve opportunities from multiple
 * external sources.
 *
 * Examples:
 *
 *   - Remote OK
 *   - Devpost
 *   - Future job platforms
 *   - Future hackathon platforms
 *   - Future scholarship platforms
 *
 * Every external source has its own API or HTML structure.
 *
 * The provider interface creates a common contract between
 * those external sources and the rest of Route.
 *
 * The architecture becomes:
 *
 *   External Source
 *        ↓
 *   Provider
 *        ↓
 *   Opportunity[]
 *        ↓
 *   MCP Tool
 *
 * The MCP tools therefore do NOT need to know how a particular
 * website works.
 */

import type { Opportunity, OpportunityType } from "../types.js";

/**
 * Parameters that can be passed when searching an opportunity
 * provider.
 *
 * These parameters intentionally describe what the user wants,
 * rather than how a specific provider performs its search.
 *
 * For example, Remote OK might use tags while Devpost might
 * use different filtering mechanisms.
 *
 * The provider is responsible for translating these generic
 * parameters into whatever the external source understands.
 */
export interface OpportunitySearchParams {
  /**
   * Optional keyword that can be used to narrow the search.
   *
   * Examples:
   *
   *   "typescript"
   *   "software engineer"
   *   "AI"
   */
  keyword?: string;

  /**
   * Optional opportunity type.
   *
   * A provider can use this to determine whether it should
   * return jobs, hackathons, or another supported category.
   */
  type?: OpportunityType;

  /**
   * Optional remote-only filter.
   *
   * When true, the provider should attempt to return only
   * opportunities that can be completed remotely.
   */
  remote?: boolean;
}

/**
 * The common contract every Route opportunity provider must
 * implement.
 *
 * This is an interface rather than a class because we only
 * want to define the behavior that providers must expose.
 *
 * Individual providers can then implement that behavior in
 * completely different ways.
 */
export interface OpportunityProvider {
  /**
   * Unique name identifying the provider.
   *
   * Examples:
   *
   *   "remoteok"
   *   "devpost"
   *
   * This value will eventually be stored on normalized
   * opportunities as their `source`.
   */
  readonly name: string;

  /**
   * The opportunity types this provider can return.
   *
   * Examples:
   *
   *   Remote OK → ["job"]
   *   Devpost   → ["hackathon"]
   *
   * This allows Route to determine which provider should
   * participate in a particular search.
   */
  readonly supportedTypes: readonly OpportunityType[];

  /**
   * Search the external source and return normalized
   * Route opportunities.
   *
   * The provider is responsible for:
   *
   *   1. Requesting the external source.
   *   2. Parsing its response.
   *   3. Extracting relevant information.
   *   4. Normalizing that information.
   *   5. Returning Route Opportunity objects.
   */
  search(params: OpportunitySearchParams): Promise<Opportunity[]>;
}
