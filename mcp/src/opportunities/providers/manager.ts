import type { Opportunity } from "../types.js";

import type {
  OpportunityProvider,
  OpportunitySearchParams,
  OpportunitySearchType,
} from "./types.js";

import { RemoteOkProvider } from "./remoteOk.js";
import { DevpostProvider } from "./devpost.js";

/**
 * Result returned by the Provider Manager.
 *
 * The manager combines results from multiple providers.
 *
 * We also preserve the continuation cursor from each provider
 * because the Search Service will eventually use these to build
 * Route's single opaque continuation cursor.
 */
export interface OpportunityProviderManagerResult {
  /**
   * Combined opportunities from all selected providers.
   */
  opportunities: Opportunity[];

  /**
   * Continuation cursors returned by the providers.
   *
   * Example:
   *
   * {
   *   devpost: "devpost:4",
   *   remoteok: "remoteok:2"
   * }
   *
   * The Search Service will later turn this provider-specific
   * state into one Route-level cursor.
   */
  cursors: Record<string, string | undefined>;
}

/**
 * Coordinates the opportunity providers available to Route.
 *
 * The Provider Manager's job is provider selection and
 * coordination.
 *
 * It does NOT:
 * - understand Devpost pagination
 * - understand Remote OK pagination
 * - rank opportunities
 * - enforce the final global result limit
 *
 * Those responsibilities belong elsewhere.
 */
export class OpportunityProviderManager {
  private readonly providers: OpportunityProvider[];

  /**
   * Create the provider manager.
   *
   * Providers can be supplied manually, which makes this class
   * easier to test later.
   *
   * If no providers are supplied, Route uses the currently
   * supported providers.
   */
  constructor(providers?: OpportunityProvider[]) {
    this.providers = providers ?? [
      new RemoteOkProvider(),
      new DevpostProvider(),
    ];
  }

  /**
   * Return all currently registered providers.
   */
  getProviders(): OpportunityProvider[] {
    return [...this.providers];
  }

  /**
   * Select providers based on the requested search type.
   *
   * Examples:
   *
   * type = "job"
   *     → Remote OK
   *
   * type = "hackathon"
   *     → Devpost
   *
   * type = "all"
   *     → all registered providers
   *
   * type = undefined
   *     → all registered providers
   */
  private selectProviders(type?: OpportunitySearchType): OpportunityProvider[] {
    /**
     * No type or "all" means:
     *
     * "Search every provider currently registered."
     */
    if (!type || type === "all") {
      return [...this.providers];
    }

    /**
     * Otherwise only select providers that explicitly
     * advertise support for the requested opportunity type.
     */
    return this.providers.filter((provider) =>
      provider.supportedTypes.includes(type),
    );
  }

  /**
   * Search all providers selected for the request.
   *
   * Providers are queried in parallel because there is no reason
   * for Route to wait for one provider before asking another.
   */
  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunityProviderManagerResult> {
    const selectedProviders = this.selectProviders(params.type);

    /**
     * If no provider supports the requested type,
     * return an empty result instead of throwing.
     */
    if (selectedProviders.length === 0) {
      return {
        opportunities: [],
        cursors: {},
      };
    }

    /**
     * Query every selected provider concurrently.
     */
    const providerResults = await Promise.all(
      selectedProviders.map(async (provider) => {
        const result = await provider.search(params);

        return {
          provider,
          result,
        };
      }),
    );

    /**
     * Flatten all provider results into one list.
     *
     * We deliberately do NOT apply the final global limit here.
     *
     * For example:
     *
     * limit = 10
     *
     * Remote OK → 10
     * Devpost   → 10
     *
     * The Search Service will later decide which 10 should
     * actually be returned to the AI.
     */
    const opportunities = providerResults.flatMap(
      ({ result }) => result.opportunities,
    );

    /**
     * Preserve each provider's continuation cursor.
     *
     * We use the provider's name as the key so the Search Service
     * can later build a combined Route cursor.
     */
    const cursors: Record<string, string | undefined> = {};

    for (const { provider, result } of providerResults) {
      cursors[provider.name] = result.nextCursor;
    }

    return {
      opportunities,
      cursors,
    };
  }
}
