import type { OpportunityPreparationContext } from "../preparation/types.js";

import { OpportunityProviderManager } from "../providers/manager.js";

/**
 * Preparation Service
 *
 * Coordinates Route's prepare_opportunity capability.
 *
 * The service intentionally does not know how Remote OK,
 * Devpost, or any future provider retrieves preparation data.
 *
 * Its responsibility is to coordinate the application-level flow:
 *
 *     opportunity URL
 *             ↓
 *     Provider Manager
 *             ↓
 *     normalized Opportunity
 *             ↓
 *     Provider Manager
 *             ↓
 *     provider preparation context
 *
 * Provider-specific retrieval remains inside the providers.
 */
export class PreparationService {
  /**
   * Provider Manager is injected so the service remains easy to test.
   *
   * In production, the default manager is used.
   *
   * In tests, a mock manager can be supplied without making
   * external HTTP requests.
   */
  constructor(
    private readonly providerManager = new OpportunityProviderManager(),
  ) {}

  /**
   * Prepare an opportunity identified by its URL.
   *
   * This operation deliberately happens in two stages:
   *
   * 1. Resolve the URL into Route's normalized Opportunity.
   * 2. Ask the owning provider for preparation context.
   *
   * This ensures preparation always starts from the same normalized
   * Opportunity model used by the rest of Route.
   */
  async prepareOpportunity(
    url: string,
  ): Promise<OpportunityPreparationContext | null> {
    /**
     * First resolve the opportunity through the existing
     * Provider Manager retrieval path.
     *
     * This also ensures unsupported URLs are rejected by the
     * provider ownership mechanism instead of Route arbitrarily
     * fetching any URL supplied by a caller.
     */
    const opportunity = await this.providerManager.getByUrl(url);

    /**
     * No provider could retrieve the opportunity.
     *
     * Returning null allows the MCP layer to decide how to
     * communicate the failure to the connected agent.
     */
    if (!opportunity) {
      return null;
    }

    /**
     * Now delegate preparation to the provider that owns the
     * opportunity.
     *
     * The provider manager handles provider selection so this
     * service remains completely provider-agnostic.
     */
    return this.providerManager.getPreparationContext(opportunity);
  }
}
