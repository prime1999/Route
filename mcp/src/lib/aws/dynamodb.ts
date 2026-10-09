/**
 * Shared DynamoDB client for ROUTE.
 *
 * This module is responsible only for configuring the AWS
 * DynamoDB client. It does not contain any opportunity logic
 * or persistence logic.
 *
 * Keeping this separate means the rest of ROUTE can depend
 * on a configured DynamoDB client without knowing how AWS
 * authentication or configuration works.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Create the low-level DynamoDB client.
 *
 * The AWS SDK uses its standard credential provider chain.
 * This means we do NOT put AWS access keys directly in code.
 *
 * Locally, credentials can come from the AWS CLI/profile or
 * environment variables.
 *
 * In AWS deployment, credentials can come from the IAM role
 * attached to the server.
 */
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

/**
 * Create the Document Client.
 *
 * DynamoDB's low-level client works with AttributeValue objects.
 * The Document Client lets us work with normal JavaScript/TypeScript
 * values instead.
 *
 * Example:
 *
 *     {
 *       agentId: "route_agent_123",
 *       opportunityId: "devpost:abc"
 *     }
 *
 * instead of manually constructing DynamoDB AttributeValue objects.
 */
export const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);
