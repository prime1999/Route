import type { Opportunity } from "../types.js";

import type { OpportunityPreparationContext } from "../preparation/types.js";

import type {
  OpportunityProvider,
  OpportunitySearchParams,
  OpportunitySearchType,
} from "./types.js";

import { RemoteOkProvider } from "./remoteOk.js";
import { DevpostProvider } from "./devpost.js";

/**
 * Provider-specific continuation state.
 *
 * Example:
 *
 * {
 *   remoteok: undefined,
 *   devpost: "devpost:2"
 * }
 *
 * This structure is internal to Route.
 * It should never be exposed directly through the MCP interface.
 */
export type ProviderCursors = Record<string, string | undefined>;

/**
 * Result returned by the Provider Manager.
 *
 * The manager deliberately does NOT enforce Route's final
 * global result limit.
 *
 * Its job is provider coordination, not final search semantics.
 */
export interface OpportunityProviderManagerResult {
  /**
   * Opportunities returned by the selected providers.
   */
  opportunities: Opportunity[];

  /**
   * Continuation state returned by each provider.
   */
  cursors: ProviderCursors;
}

/**
 * Coordinates Route's registered opportunity providers.
 *
 * Responsibilities:
 * - register providers
 * - decide which providers participate
 * - call providers
 * - preserve provider-specific continuation state
 * - resolve which provider owns a direct opportunity URL
 *
 * Responsibilities intentionally NOT handled here:
 * - global result limiting
 * - deduplication
 * - opaque Route cursors
 * - ranking
 * - MCP tool handling
 * - provider-specific data parsing
 */
export class OpportunityProviderManager {
  /**
   * Providers currently registered with Route.
   *
   * The manager does not need to know the implementation details
   * of each provider. It communicates with them through the
   * OpportunityProvider interface.
   */
  private readonly providers: OpportunityProvider[];

  constructor(providers?: OpportunityProvider[]) {
    /**
     * Allow dependency injection for testing.
     *
     * In production, Route uses its default providers.
     *
     * Tests can provide mock providers instead, which keeps the
     * manager independent from live external services.
     */
    this.providers = providers ?? [
      new RemoteOkProvider(),
      new DevpostProvider(),
    ];
  }

  /**
   * Return the currently registered providers.
   *
   * A copy is returned so callers cannot mutate the manager's
   * internal provider list.
   */
  getProviders(): OpportunityProvider[] {
    return [...this.providers];
  }

  /**
   * Select providers based on the requested opportunity type.
   *
   * Examples:
   *
   * type = "job"
   * → Remote OK
   *
   * type = "hackathon"
   * → Devpost
   *
   * type = "all"
   * → both
   */
  private selectProviders(type?: OpportunitySearchType): OpportunityProvider[] {
    /**
     * No type or "all" means every registered provider
     * participates in the search.
     */
    if (!type || type === "all") {
      return [...this.providers];
    }

    /**
     * Otherwise only providers supporting the requested
     * opportunity type participate.
     */
    return this.providers.filter((provider) =>
      provider.supportedTypes.includes(type),
    );
  }

  /**
   * Resolve which registered provider owns a specific URL.
   *
   * This is shared by operations that work with a direct opportunity
   * URL, such as:
   *
   * - getByUrl()
   * - getPreparationContext()
   *
   * Keeping URL ownership in one method prevents those operations
   * from implementing slightly different provider-selection logic.
   *
   * Providers are responsible for deciding whether they own a URL
   * through canHandleUrl().
   *
   * The ownership check must remain local and deterministic.
   * It should not perform a network request.
   */
  private resolveProviderByUrl(url: string): OpportunityProvider | null {
    return (
      this.providers.find((provider) => provider.canHandleUrl(url)) ?? null
    );
  }

  /**
   * Search the selected providers.
   *
   * providerCursors allows Route to continue each provider
   * independently.
   */
  async search(
    params: OpportunitySearchParams,
    providerCursors: ProviderCursors = {},
  ): Promise<OpportunityProviderManagerResult> {
    /**
     * Determine which providers should participate in this
     * particular search.
     */
    const selectedProviders = this.selectProviders(params.type);

    /**
     * If no provider supports the requested type, return
     * an empty result rather than throwing an error.
     */
    if (selectedProviders.length === 0) {
      return {
        opportunities: [],
        cursors: {},
      };
    }

    /**
     * Search all selected providers concurrently.
     *
     * Each provider receives only its own continuation cursor.
     */
    const providerResults = await Promise.all(
      selectedProviders.map(async (provider) => {
        const result = await provider.search({
          ...params,

          /**
           * Override the generic cursor with the cursor belonging
           * specifically to this provider.
           */
          cursor: providerCursors[provider.name],
        });

        return {
          provider,
          result,
        };
      }),
    );

    /**
     * Combine all provider results into one collection.
     *
     * The manager intentionally does not apply the final
     * Route-level limit here.
     */
    const opportunities = providerResults.flatMap(
      ({ result }) => result.opportunities,
    );

    /**
     * Preserve each provider's continuation state.
     *
     * The Search Service will later turn this internal
     * structure into one opaque Route cursor.
     */
    const cursors: ProviderCursors = {};

    for (const { provider, result } of providerResults) {
      cursors[provider.name] = result.nextCursor;
    }

    return {
      opportunities,
      cursors,
    };
  }

  /**
   * Resolve an opportunity URL to the provider that owns it
   * and delegate retrieval to that provider.
   *
   * The Provider Manager is responsible only for routing.
   *
   * It does NOT:
   * - fetch the URL itself
   * - understand provider-specific URL formats
   * - parse provider-specific responses
   * - normalize external data
   */
  async getByUrl(url: string): Promise<Opportunity | null> {
    /**
     * Resolve ownership through the shared URL resolver.
     */
    const provider = this.resolveProviderByUrl(url);

    /**
     * No registered provider recognizes this URL.
     *
     * Returning null keeps the Provider Manager neutral.
     * The application/service layer decides how this condition
     * should be represented to the MCP client.
     */
    if (!provider) {
      return null;
    }

    /**
     * Delegate retrieval and normalization to the provider.
     */
    return provider.getByUrl(url);
  }

  /**
   * Retrieve preparation context for a specific opportunity.
   *
   * The opportunity has already been resolved by the service layer.
   * The manager's responsibility here is simply to determine which
   * provider owns that opportunity URL and delegate preparation
   * to that provider.
   *
   * This keeps preparation provider-agnostic at the manager level.
   */
  async getPreparationContext(
    opportunity: Opportunity,
  ): Promise<OpportunityPreparationContext | null> {
    /**
     * Resolve the provider from the opportunity's canonical URL.
     */
    const provider = this.resolveProviderByUrl(opportunity.url);

    /**
     * If no provider owns this URL, Route cannot safely determine
     * how to retrieve preparation information.
     */
    if (!provider) {
      return null;
    }

    /**
     * Delegate provider-specific preparation retrieval.
     *
     * The provider is responsible for:
     * - fetching source content
     * - extracting provider-specific preparation information
     * - preserving source content
     * - returning the normalized preparation contract
     */
    return provider.getPreparationContext(opportunity);
  }
}
