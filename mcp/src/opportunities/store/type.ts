/**
 * Represents an opportunity that has been saved by an agent.
 *
 * We intentionally store only the opportunity URL rather than
 * the complete Opportunity object.
 *
 * Why?
 * - Opportunity data can become stale.
 * - get_opportunity remains the source of truth for fresh data.
 * - The store is responsible for saved state, not opportunity data.
 */
export interface SavedOpportunity {
  /**
   * Stable ROUTE-generated identity for the agent namespace.
   */
  agentId: string;

  /**
   * URL identifying the opportunity.
   */
  url: string;

  /**
   * Timestamp indicating when the opportunity was saved.
   */
  savedAt: string;
}

/**
 * Persistence boundary for saved opportunities.
 *
 * The rest of ROUTE should depend on this interface rather than
 * depending directly on DynamoDB.
 *
 * This keeps the application layer independent of the database.
 */
export interface OpportunityStore {
  /**
   * Save an opportunity reference for an agent.
   *
   * Implementations should make this operation idempotent:
   * saving the same opportunity for the same agent should not
   * create duplicate records.
   */
  save(agentId: string, url: string): Promise<SavedOpportunity>;

  /**
   * Retrieve all opportunities saved by an agent.
   *
   * The retrieval MCP tool will use this later.
   */
  getByAgent(agentId: string): Promise<SavedOpportunity[]>;
}
