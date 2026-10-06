import type { Opportunity } from "../types.js";

import { OpportunityProviderManager } from "../providers/manager.js";

/**
 * Opportunity Service
 *
 * The Opportunity Service is the application-level layer responsible
 * for retrieving a single opportunity from Route's provider
 * infrastructure.
 *
 * This service intentionally sits between the MCP/tool layer and the
 * Provider Manager:
 *
 *      MCP get_opportunity
 *              ↓
 *      OpportunityService
 *              ↓
 *      OpportunityProviderManager
 *              ↓
 *      Provider
 *              ↓
 *      External Source
 *
 * The important architectural rule here is that this service does
 * NOT know anything about individual providers.
 *
 * For example, it should not contain logic such as:
 *
 *      if (url.includes("remoteok.com")) { ... }
 *
 * or:
 *
 *      if (url.includes("devpost.com")) { ... }
 *
 * Provider ownership is already handled by the Provider Manager,
 * while source-specific retrieval is handled by the provider itself.
 *
 * Keeping this service thin gives Route a clean application boundary
 * and makes it easier to add more providers in the future without
 * changing the service.
 */
export class OpportunityService {
  /**
   * Provider Manager used to coordinate Route's opportunity providers.
   *
   * The manager is injected through the constructor rather than being
   * created inside getByUrl().
   *
   * This gives us two benefits:
   *
   * 1. The service remains independent of specific providers.
   * 2. Tests can provide a controlled Provider Manager when needed.
   *
   * If no manager is supplied, Route creates the default manager,
   * which currently contains the supported providers.
   */
  constructor(
    private readonly providerManager = new OpportunityProviderManager(),
  ) {}

  /**
   * Retrieve a single opportunity using its canonical source URL.
   *
   * The URL is the public lookup key used by the future MCP
   * get_opportunity tool.
   *
   * This method deliberately delegates the entire retrieval process
   * to the Provider Manager.
   *
   * The Provider Manager is responsible for:
   *
   * 1. Determining which provider owns the URL.
   * 2. Selecting the matching provider.
   * 3. Calling that provider's getByUrl() method.
   *
   * The selected provider is then responsible for:
   *
   * - fetching the source data
   * - parsing the source-specific response
   * - normalizing the result into Route's Opportunity model
   *
   * If no provider recognizes the URL, or the provider cannot find
   * the opportunity, null is returned.
   *
   * @param url
   * The canonical source URL of the opportunity.
   *
   * @returns
   * A normalized Opportunity when the opportunity can be retrieved,
   * otherwise null.
   */
  async getByUrl(url: string): Promise<Opportunity | null> {
    return this.providerManager.getByUrl(url);
  }
}
