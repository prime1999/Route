import { Buffer } from "node:buffer";

import type { Opportunity } from "./types.js";

import {
  OpportunityProviderManager,
  type ProviderCursors,
} from "./providers/manager.js";

import type { OpportunitySearchParams } from "./providers/types.js";

/**
 * Route-level continuation cursor.
 *
 * This is what eventually gets returned to the AI.
 *
 * Internally it stores provider-specific continuation state.
 */
interface RouteCursor {
  providerCursors: ProviderCursors;
}

/**
 * Result returned by Route's search layer.
 */
export interface OpportunitySearchResult {
  opportunities: Opportunity[];
  nextCursor?: string;
}

/**
 * Search Service.
 *
 * Responsibilities:
 * - decode Route cursors
 * - call Provider Manager
 * - deduplicate results
 * - enforce global limits
 * - create Route cursors
 */
export class OpportunitySearchService {
  constructor(
    private readonly providerManager = new OpportunityProviderManager(),
  ) {}

  /**
   * Convert Route cursor object into an opaque string.
   */
  private encodeCursor(cursor: RouteCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  }

  /**
   * Convert opaque Route cursor back into
   * provider continuation state.
   */
  private decodeCursor(cursor?: string): RouteCursor | undefined {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = Buffer.from(cursor, "base64url").toString("utf8");

      return JSON.parse(decoded);
    } catch {
      return undefined;
    }
  }

  /**
   * Remove duplicate opportunities.
   *
   * Uses the normalized Route opportunity ID.
   */
  private deduplicate(opportunities: Opportunity[]): Opportunity[] {
    const seen = new Set<string>();

    return opportunities.filter((opportunity) => {
      if (seen.has(opportunity.id)) {
        return false;
      }

      seen.add(opportunity.id);
      return true;
    });
  }

  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunitySearchResult> {
    const limit = params.limit ?? 10;

    /**
     * Decode Route continuation cursor.
     */
    const routeCursor = this.decodeCursor(params.cursor);

    /**
     * Ask Provider Manager to continue
     * from provider-specific cursors.
     */
    const providerResult = await this.providerManager.search(
      {
        ...params,
        cursor: undefined,
      },
      routeCursor?.providerCursors,
    );

    /**
     * Remove duplicates.
     */
    const uniqueResults = this.deduplicate(providerResult.opportunities);

    /**
     * Enforce Route-level limit.
     */
    const finalResults = uniqueResults.slice(0, limit);

    /**
     * Determine whether any provider
     * still has continuation state.
     */
    const hasMore = Object.values(providerResult.cursors).some(Boolean);

    let nextCursor: string | undefined;

    if (hasMore) {
      nextCursor = this.encodeCursor({
        providerCursors: providerResult.cursors,
      });
    }
    console.log("Provider cursors:", providerResult.cursors);
    return {
      opportunities: finalResults,
      nextCursor,
    };
  }
}
