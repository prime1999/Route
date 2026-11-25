/**
 * DynamoDB implementation of the OpportunityStore.
 *
 * This class is responsible only for persistence.
 *
 * It does NOT:
 * - fetch opportunities from providers
 * - validate opportunity URLs
 * - understand Devpost or RemoteOK
 * - handle MCP requests
 * - decide whether an opportunity is useful
 *
 * Those responsibilities belong to other layers of ROUTE.
 */

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { dynamoDB } from "../../lib/aws/dynamodb.js";

import type {
  OpportunityStore,
  SavedOpportunity,
  StoredOpportunity,
} from "./types.js";

/**
 * DynamoDB implementation of the OpportunityStore contract.
 */
export class DynamoDBOpportunityStore implements OpportunityStore {
  /**
   * Name of the table containing ROUTE's lightweight
   * opportunity records.
   */
  private readonly opportunitiesTable =
    process.env.DYNAMODB_OPPORTUNITIES_TABLE ?? "ROUTE_Opportunities";

  /**
   * Name of the table containing Agent → Opportunity
   * relationships.
   */
  private readonly agentOpportunitiesTable =
    process.env.DYNAMODB_AGENT_OPPORTUNITIES_TABLE ??
    "ROUTE_AgentOpportunities";

  /**
   * Ensure that an opportunity exists in ROUTE's
   * lightweight opportunity registry.
   *
   * We intentionally do NOT overwrite an existing record.
   *
   * This means the first time ROUTE sees an opportunity,
   * it creates the lightweight record.
   *
   * If another agent later saves the same opportunity,
   * the existing record is simply reused.
   */
  async ensureOpportunity(opportunity: StoredOpportunity): Promise<void> {
    try {
      await dynamoDB.send(
        new PutCommand({
          TableName: this.opportunitiesTable,

          Item: {
            opportunityId: opportunity.opportunityId,
            url: opportunity.url,
          },

          /**
           * Only create the item if an opportunity with
           * this canonical ID does not already exist.
           *
           * This prevents another save operation from
           * replacing the existing record.
           */
          ConditionExpression: "attribute_not_exists(opportunityId)",
        }),
      );
    } catch (error) {
      /**
       * A failed condition simply means another request
       * already created this opportunity.
       *
       * That is expected and is not an application error.
       */
      if (error instanceof ConditionalCheckFailedException) {
        return;
      }

      /**
       * Any other DynamoDB error is a real persistence
       * failure and must be propagated.
       */
      throw error;
    }
  }

  /**
   * Create the relationship:
   *
   *     Agent → Opportunity
   *
   * The DynamoDB primary key is:
   *
   *     agentId + opportunityId
   *
   * which naturally prevents the same agent from saving
   * the same opportunity more than once.
   */
  async saveRelationship(
    agentId: string,
    opportunityId: string,
    url: string,
  ): Promise<{
    savedOpportunity: SavedOpportunity;
    alreadySaved: boolean;
  }> {
    const savedAt = new Date().toISOString();

    const savedOpportunity: SavedOpportunity = {
      agentId,
      opportunityId,
      url,
      savedAt,
    };

    try {
      await dynamoDB.send(
        new PutCommand({
          TableName: this.agentOpportunitiesTable,

          Item: savedOpportunity,

          /**
           * Only create this relationship if the item
           * does not already exist.
           */
          ConditionExpression: "attribute_not_exists(agentId)",
        }),
      );

      /**
       * The relationship was successfully created.
       */
      return {
        savedOpportunity,
        alreadySaved: false,
      };
    } catch (error) {
      /**
       * Conditional failure means this exact
       * Agent → Opportunity relationship already exists.
       */
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }

      /**
       * Retrieve the existing relationship so we can
       * return its original savedAt value.
       */
      const existing = await dynamoDB.send(
        new GetCommand({
          TableName: this.agentOpportunitiesTable,

          Key: {
            agentId,
            opportunityId,
          },
        }),
      );

      /**
       * This should normally exist because the conditional
       * write told us that the relationship already exists.
       *
       * If it somehow doesn't, treat that as a persistence
       * inconsistency rather than silently returning bad data.
       */
      if (!existing.Item) {
        throw new Error(
          "Saved opportunity relationship exists but could not be retrieved.",
        );
      }

      return {
        savedOpportunity: existing.Item as SavedOpportunity,
        alreadySaved: true,
      };
    }
  }

  /**
   * Retrieve every opportunity saved by an agent.
   *
   * Because agentId is the partition key of
   * ROUTE_AgentOpportunities, this becomes a DynamoDB
   * Query rather than a table scan.
   */
  async getByAgent(agentId: string): Promise<SavedOpportunity[]> {
    const result = await dynamoDB.send(
      new QueryCommand({
        TableName: this.agentOpportunitiesTable,

        KeyConditionExpression: "agentId = :agentId",

        ExpressionAttributeValues: {
          ":agentId": agentId,
        },
      }),
    );

    return (result.Items ?? []) as SavedOpportunity[];
  }
}
