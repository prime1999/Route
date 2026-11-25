/**
 * Represents ROUTE's lightweight record for an opportunity
 * that has been saved into persistent state.
 *
 * This does NOT contain the full opportunity details.
 *
 * The provider layer remains the source of truth for the
 * actual opportunity information.
 */
export interface StoredOpportunity {
  /**
   * Canonical opportunity identifier.
   *
   * This comes from the normalized Opportunity returned
   * by the provider layer.
   */
  opportunityId: string;

  /**
   * Canonical URL of the opportunity.
   *
   * This allows ROUTE to resolve the opportunity again
   * through get_opportunity when needed.
   */
  url: string;
}

/**
 * Represents the relationship between an agent
 * and an opportunity.
 */
export interface SavedOpportunity {
  /**
   * Stable ROUTE identifier for the agent.
   */
  agentId: string;

  /**
   * Canonical identifier of the opportunity.
   */
  opportunityId: string;

  /**
   * URL of the opportunity.
   */
  url: string;

  /**
   * Time at which the relationship was created.
   */
  savedAt: string;
}

/**
 * Persistence boundary for saved opportunities.
 *
 * The application layer depends on this interface rather
 * than depending directly on DynamoDB.
 */
export interface OpportunityStore {
  /**
   * Ensure that an opportunity exists in ROUTE's
   * lightweight opportunity registry.
   *
   * This operation must be idempotent.
   */
  ensureOpportunity(opportunity: StoredOpportunity): Promise<void>;

  /**
   * Create a relationship between an agent and an opportunity.
   *
   * Saving the same relationship more than once must not
   * create duplicate records.
   */
  saveRelationship(
    agentId: string,
    opportunityId: string,
    url: string,
  ): Promise<{
    savedOpportunity: SavedOpportunity;
    alreadySaved: boolean;
  }>;

  /**
   * Retrieve all opportunities saved by an agent.
   */
  getByAgent(agentId: string): Promise<SavedOpportunity[]>;
}

/**
 * Input required to save an opportunity.
 *
 * An agent can identify itself in one of two ways:
 *
 * 1. By providing an existing ROUTE agentId.
 * 2. By providing an agentName when it does not yet have
 *    a ROUTE agentId.
 *
 * agentName is only used when creating the initial identity.
 * agentId remains the actual stable identity.
 */
export interface SaveOpportunityInput {
  /**
   * Existing ROUTE-generated identity for the agent.
   */
  agentId?: string;

  /**
   * Human-readable agent name.
   *
   * This is metadata and is NOT used as the agent's identity.
   */
  agentName?: string;

  /**
   * URL of the opportunity to save.
   */
  url: string;
}
