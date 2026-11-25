import type { Opportunity } from "../types.js";

import { randomUUID } from "node:crypto";

import { OpportunityProviderManager } from "../providers/manager.js";

import type { OpportunityStore, SaveOpportunityInput } from "../store/types.js";

import { DynamoDBOpportunityStore } from "../store/dynamodbOpportunityStore.js";

/**
 * Opportunity Service
 *
 * The Opportunity Service is the application-level layer responsible
 * for coordinating Route's opportunity operations.
 *
 * This service intentionally sits between the MCP/tool layer and Route's
 * lower-level infrastructure:
 *
 *      MCP Tool
 *          ↓
 *      OpportunityService
 *          ↓
 *      ┌───────────────────────┐
 *      │ Provider Manager      │
 *      │                       │
 *      │ Opportunity Store     │
 *      └───────────────────────┘
 *
 * The service does NOT know anything about individual providers or
 * database implementation details.
 *
 * For example, it should not contain logic such as:
 *
 *      if (url.includes("remoteok.com")) { ... }
 *
 * or:
 *
 *      if (url.includes("devpost.com")) { ... }
 *
 * Provider ownership is handled by the Provider Manager.
 *
 * Likewise, persistence is handled through the OpportunityStore
 * abstraction rather than directly through DynamoDB.
 *
 * Keeping these responsibilities separated gives Route a clean
 * application boundary and makes the service easier to test.
 */
export class OpportunityService {
  /**
   * Provider Manager used to coordinate Route's opportunity providers.
   *
   * The manager is injected through the constructor rather than being
   * created inside individual service methods.
   *
   * This keeps the service independent of specific providers and allows
   * tests to provide a controlled Provider Manager when needed.
   *
   * If no manager is supplied, Route creates the default manager,
   * which currently contains the supported providers.
   */
  constructor(
    private readonly providerManager = new OpportunityProviderManager(),

    /**
     * Persistence layer used for Route's saved opportunity state.
     *
     * The service depends on the OpportunityStore interface rather
     * than directly depending on DynamoDB.
     *
     * This means the application layer does not need to know:
     *
     * - which database is being used
     * - which DynamoDB commands are required
     * - how tables are structured
     * - how duplicate relationships are handled
     *
     * The default implementation is DynamoDBOpportunityStore,
     * while tests can inject another implementation.
     */
    private readonly opportunityStore: OpportunityStore = new DynamoDBOpportunityStore(),
  ) {}

  /**
   * Retrieve a single opportunity using its canonical source URL.
   *
   * The URL is the public lookup key used by the MCP
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
  /**
   * Save an opportunity for an agent.
   *
   * Agent identity follows Route's identity model:
   *
   *      Existing agent
   *          ↓
   *      agentId provided
   *          ↓
   *      use that identity
   *
   *      New agent
   *          ↓
   *      no agentId
   *          ↓
   *      agentName provided
   *          ↓
   *      generate ROUTE agentId
   *
   * The generated agentId is returned to the caller.
   *
   * Route does NOT attempt to remember how an agent connects to
   * the server or identify the human behind the agent.
   *
   * The consuming agent/runtime is responsible for preserving the
   * returned agentId and supplying it on future requests.
   *
   * @param input
   * Information required to save the opportunity.
   *
   * @returns
   * The saved relationship and the agentId that should be used
   * for future requests.
   */
  async saveOpportunity(input: SaveOpportunityInput) {
    /**
     * Resolve the agent identity first.
     *
     * If the caller already has a ROUTE agentId, that identity
     * takes precedence.
     */
    let agentId = input.agentId;

    /**
     * If no existing agentId was supplied, this is a new agent
     * from Route's perspective.
     *
     * agentName is required in this case because it gives Route
     * basic metadata about the new agent.
     */
    if (!agentId) {
      if (!input.agentName) {
        throw new Error("Either agentId or agentName must be provided.");
      }

      /**
       * Generate a stable ROUTE identity.
       *
       * The UUID itself provides uniqueness.
       *
       * The "route_agent_" prefix makes it immediately clear
       * that this identifier was issued by Route.
       */
      agentId = `route_agent_${randomUUID()}`;
    }

    /**
     * Resolve the opportunity through the existing provider system.
     *
     * Route must never persist an arbitrary URL as an opportunity.
     */
    const opportunity = await this.getByUrl(input.url);

    /**
     * If no registered provider recognizes or can retrieve the URL,
     * nothing should be persisted.
     */
    if (!opportunity) {
      return null;
    }

    /**
     * Ensure that Route has a lightweight record for the opportunity.
     *
     * We intentionally store only the canonical opportunity identity
     * and URL here.
     *
     * The provider remains the source of truth for the full
     * opportunity details.
     */
    await this.opportunityStore.ensureOpportunity({
      opportunityId: opportunity.id,
      url: opportunity.url,
    });

    /**
     * Create the Agent → Opportunity relationship.
     *
     * The store handles duplicate relationships and tells us
     * whether this opportunity was already saved by this agent.
     */
    const result = await this.opportunityStore.saveRelationship(
      agentId,
      opportunity.id,
      opportunity.url,
    );

    /**
     * Always return the agentId.
     *
     * This is particularly important for a newly created agent.
     *
     * The consuming agent/runtime is responsible for preserving
     * this ID and using it in future Route requests.
     */
    return {
      agentId,
      ...result,
    };
  }

  /**
   * Retrieve the opportunities saved by an agent.
   *
   * The store returns lightweight relationship records.
   *
   * The consuming application can then use the opportunity IDs
   * or URLs to retrieve fresh opportunity details through
   * get_opportunity when needed.
   *
   * @param agentId
   * Stable ROUTE identifier for the agent.
   *
   * @returns
   * All saved opportunity relationships belonging to the agent.
   */
  async getSavedOpportunities(agentId: string) {
    return this.opportunityStore.getByAgent(agentId);
  }
}
