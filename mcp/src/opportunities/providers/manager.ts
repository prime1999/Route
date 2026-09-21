import type { Opportunity } from "../types.js";

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
 *
 * Responsibilities intentionally NOT handled here:
 * - global result limiting
 * - deduplication
 * - opaque Route cursors
 * - ranking
 * - MCP tool handling
 */
export class OpportunityProviderManager {
  private readonly providers: OpportunityProvider[];

  constructor(providers?: OpportunityProvider[]) {
    /**
     * Allow dependency injection for testing.
     *
     * In production, Route uses its default providers.
     */
    this.providers = providers ?? [
      new RemoteOkProvider(),
      new DevpostProvider(),
    ];
  }

  /**
   * Return the currently registered providers.
   *
   * A copy is returned so callers cannot mutate the
   * manager's internal provider list.
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
           * Override the generic cursor with the
           * cursor belonging specifically to this
           * provider.
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
}
