import { Buffer } from "node:buffer";

import type { Opportunity, OpportunityType } from "./types.js";

import {
  OpportunityProviderManager,
  type ProviderCursors,
} from "./providers/manager.js";

import type { OpportunitySearchParams } from "./providers/types.js";

/**
 * The Route-level cursor is intentionally different from the
 * provider-level cursors.
 *
 * Providers such as Devpost and Remote OK have different pagination
 * strategies. Route therefore keeps those cursors internally and
 * exposes only one opaque cursor to MCP clients.
 *
 * Example internal state:
 *
 * {
 *   providerCursors: {
 *     remoteok: "remoteok:5",
 *     devpost: "devpost:2"
 *   }
 * }
 *
 * The MCP client never needs to understand what these values mean.
 */
interface RouteCursor {
  providerCursors: ProviderCursors;
}

/**
 * The result returned by the Search Service.
 *
 * `nextCursor` is optional because a search may reach the end of all
 * relevant providers.
 */
export interface OpportunitySearchResult {
  opportunities: Opportunity[];
  nextCursor?: string;
}

/**
 * Search Service
 *
 * The Search Service is responsible for turning provider-level results
 * into Route-level search semantics.
 *
 * Providers know HOW to retrieve opportunities.
 *
 * The Search Service knows WHAT Route's search contract means.
 *
 * In particular:
 *
 * - `job`      → return up to `limit` jobs
 * - `hackathon` → return up to `limit` hackathons
 * - `all`      → return up to `limit` opportunities for EACH supported type
 *
 * This separation is important because providers should not need to
 * understand Route's user-facing result distribution rules.
 */
export class OpportunitySearchService {
  constructor(
    private readonly providerManager = new OpportunityProviderManager(),
  ) {}

  /**
   * Convert Route's internal cursor state into an opaque string.
   *
   * The cursor is base64url encoded so that MCP clients can safely
   * transport it without needing to understand its structure.
   */
  private encodeCursor(cursor: RouteCursor): string {
    return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  }

  /**
   * Decode a Route cursor supplied by the caller.
   *
   * Invalid cursors are treated as if no cursor was supplied.
   *
   * This keeps malformed client input from crashing the entire
   * search request.
   */
  private decodeCursor(cursor?: string): RouteCursor | undefined {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = Buffer.from(cursor, "base64url").toString("utf8");

      return JSON.parse(decoded) as RouteCursor;
    } catch {
      return undefined;
    }
  }

  /**
   * Remove duplicate opportunities.
   *
   * Opportunity IDs are globally namespaced by their provider
   * (`remoteok:123`, `devpost:456`, etc.), which gives Route a
   * stable identifier for deduplication.
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

  /**
   * Group opportunities by their Route opportunity type.
   *
   * This is what allows `type: "all"` to enforce the Route contract
   * of returning up to `limit` results for every supported type.
   */
  private groupByType(
    opportunities: Opportunity[],
  ): Map<OpportunityType, Opportunity[]> {
    const grouped = new Map<OpportunityType, Opportunity[]>();

    for (const opportunity of opportunities) {
      const existing = grouped.get(opportunity.type) ?? [];

      existing.push(opportunity);

      grouped.set(opportunity.type, existing);
    }

    return grouped;
  }

  /**
   * Apply Route's final result semantics.
   *
   * For a specific type:
   *
   *   job + limit 5
   *   → up to 5 jobs
   *
   * For `all`:
   *
   *   all + limit 5
   *   → up to 5 jobs
   *   → up to 5 hackathons
   *
   * This function deliberately operates AFTER providers have returned
   * normalized opportunities. That keeps provider implementations
   * independent from Route's final response contract.
   */
  private applyResultLimit(
    opportunities: Opportunity[],
    type: OpportunitySearchParams["type"],
    limit: number,
  ): Opportunity[] {
    const uniqueResults = this.deduplicate(opportunities);

    /**
     * For a specific type, all returned opportunities should already
     * belong to that type because the Provider Manager selects
     * compatible providers.
     *
     * We still slice here so the Search Service remains the final
     * authority over the number of results exposed to the caller.
     */
    if (type && type !== "all") {
      return uniqueResults.slice(0, limit);
    }

    /**
     * When no type is supplied, Route treats the request as `all`.
     *
     * We therefore distribute results by opportunity type instead
     * of globally slicing the combined provider result.
     */
    const grouped = this.groupByType(uniqueResults);

    const supportedTypes: OpportunityType[] = ["job", "hackathon"];

    const finalResults: Opportunity[] = [];

    for (const opportunityType of supportedTypes) {
      const typeResults = grouped.get(opportunityType) ?? [];

      finalResults.push(...typeResults.slice(0, limit));
    }

    return finalResults;
  }

  /**
   * Search across Route's opportunity providers.
   *
   * The incoming `cursor` belongs to Route, not directly to a provider.
   * We decode it and pass the provider-specific continuation state to
   * the Provider Manager.
   */
  async search(
    params: OpportunitySearchParams,
  ): Promise<OpportunitySearchResult> {
    /**
     * `limit` now represents the number of results requested PER TYPE
     * when `type` is `all`.
     *
     * Example:
     *
     *   limit: 5
     *   type: all
     *
     * means up to:
     *
     *   5 jobs
     *   5 hackathons
     *
     * rather than 5 total opportunities.
     */
    const limit = params.limit ?? 5;

    /**
     * Prevent nonsensical limits from reaching providers.
     *
     * The MCP tool will eventually validate this at the boundary,
     * but keeping this guard here protects the Search Service when
     * it is used directly by tests or other application code.
     */
    const safeLimit = Math.max(1, Math.floor(limit));

    /**
     * Decode Route's opaque cursor.
     */
    const routeCursor = this.decodeCursor(params.cursor);

    /**
     * The Provider Manager expects provider-specific cursors.
     *
     * We explicitly remove Route's cursor from the provider params
     * because passing the opaque Route cursor directly to a provider
     * would violate the provider cursor contract.
     */
    const providerResult = await this.providerManager.search(
      {
        ...params,
        limit: safeLimit,
        cursor: undefined,
      },
      routeCursor?.providerCursors,
    );

    /**
     * Apply Route's final result semantics after all provider results
     * have been normalized and combined.
     */
    const finalResults = this.applyResultLimit(
      providerResult.opportunities,
      params.type,
      safeLimit,
    );

    /**
     * A provider cursor indicates that the provider believes there is
     * more data available.
     *
     * Route combines those provider cursors into one opaque cursor
     * that can be supplied to the next search request.
     */
    const hasMore = Object.values(providerResult.cursors).some(Boolean);

    let nextCursor: string | undefined;

    if (hasMore) {
      nextCursor = this.encodeCursor({
        providerCursors: providerResult.cursors,
      });
    }

    return {
      opportunities: finalResults,
      nextCursor,
    };
  }
}
