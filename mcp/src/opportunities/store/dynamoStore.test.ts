/**
 * Temporary integration test for DynamoDBOpportunityStore.
 *
 * This test talks to the real DynamoDB tables configured
 * in the ROUTE environment.
 *
 * It verifies:
 *
 * 1. An opportunity can be registered.
 * 2. An agent can save that opportunity.
 * 3. Saving the same opportunity twice is idempotent.
 * 4. The agent's saved opportunities can be retrieved.
 */

import { DynamoDBOpportunityStore } from "./dynamodbOpportunityStore.js";

const store = new DynamoDBOpportunityStore();

/**
 * Use obviously fake test identifiers.
 *
 * We don't want to accidentally interact with a real
 * Devpost or RemoteOK opportunity while testing.
 */
const opportunity = {
  opportunityId: "test:opportunity:001",
  url: "https://example.com/test-opportunity",
};

const agentId = "route_agent_test_001";

async function runTest() {
  console.log("\n--- ROUTE DynamoDB Store Test ---\n");

  /**
   * 1. Ensure the opportunity exists.
   */
  console.log("1. Ensuring opportunity exists...");

  await store.ensureOpportunity(opportunity);

  console.log("✓ Opportunity ensured");

  /**
   * 2. Save the relationship for the first time.
   */
  console.log("\n2. Saving opportunity for agent...");

  const firstSave = await store.saveRelationship(
    agentId,
    opportunity.opportunityId,
    opportunity.url,
  );

  console.log(firstSave);

  /**
   * The first save should create a new relationship.
   */
  if (firstSave.alreadySaved) {
    throw new Error("Expected the first save to create a new relationship.");
  }

  console.log("✓ First save created the relationship");

  /**
   * 3. Save the exact same relationship again.
   */
  console.log("\n3. Saving the same opportunity again...");

  const secondSave = await store.saveRelationship(
    agentId,
    opportunity.opportunityId,
    opportunity.url,
  );

  console.log(secondSave);

  /**
   * The second save should be detected as a duplicate.
   */
  if (!secondSave.alreadySaved) {
    throw new Error("Expected the second save to return alreadySaved=true.");
  }

  console.log("✓ Duplicate save was handled correctly");

  /**
   * 4. Retrieve everything saved by this agent.
   */
  console.log("\n4. Retrieving agent's saved opportunities...");

  const saved = await store.getByAgent(agentId);

  console.log(saved);

  /**
   * We expect exactly one relationship because
   * duplicate saves must not create duplicates.
   */
  if (saved.length !== 1) {
    throw new Error(`Expected 1 saved opportunity, found ${saved.length}.`);
  }

  console.log("✓ Agent saved opportunities retrieved correctly");

  console.log("\n--- ALL STORE TESTS PASSED ---\n");
}

runTest().catch((error) => {
  console.error("\n--- STORE TEST FAILED ---\n");
  console.error(error);
  process.exit(1);
});
