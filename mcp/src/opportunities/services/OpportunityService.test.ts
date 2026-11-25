/**
 * Opportunity Service Integration Test
 *
 * This file verifies that the OpportunityService correctly coordinates
 * both opportunity retrieval and saved-opportunity persistence.
 *
 * The service sits between Route's MCP/tool layer and its infrastructure:
 *
 *      MCP Tool
 *          ↓
 *      OpportunityService
 *          ↓
 *      ┌─────────────────────────┐
 *      │ Provider Manager        │
 *      │ Opportunity Store       │
 *      └─────────────────────────┘
 *          ↓
 *      External Providers / DynamoDB
 *
 * Because the Provider Manager, individual providers, and DynamoDB
 * store have their own responsibilities, this test focuses on the
 * integration between those components through OpportunityService.
 *
 * Test cases:
 *
 * 1. Retrieve a Remote OK opportunity by URL.
 * 2. Retrieve a Devpost hackathon by URL.
 * 3. Return null for an unsupported URL.
 * 4. Save a Remote OK opportunity for an agent.
 * 5. Detect a duplicate save for the same agent and opportunity.
 * 6. Retrieve the opportunities saved by the test agent.
 *
 * This is intentionally a simple executable integration test rather
 * than a full testing-framework setup. Route currently uses small
 * executable integration tests while the architecture is being built.
 */

import { OpportunityService } from "./opportunityService.js";

/**
 * Create the service using Route's default dependencies.
 *
 * The OpportunityService creates the default Provider Manager and
 * DynamoDB Opportunity Store when no dependencies are provided.
 *
 * This gives the test the same infrastructure configuration that
 * the application will use.
 */
const opportunityService = new OpportunityService();

/**
 * Dedicated agent identity for this integration test.
 *
 * This is intentionally separate from any real agent identity so
 * the test does not interfere with application data.
 */
const testAgentId = `route_agent_service_test_${Date.now()}`;

/**
 * ------------------------------------------------------------------
 * Test 1: Retrieve an opportunity from Remote OK.
 * ------------------------------------------------------------------
 *
 * This verifies that:
 *
 * - OpportunityService accepts the URL.
 * - Provider Manager recognizes the Remote OK URL.
 * - RemoteOkProvider handles the URL.
 * - The provider retrieves and normalizes the opportunity.
 */
console.log("Test 1: Remote OK getByUrl...");

const remoteOkOpportunity = await opportunityService.getByUrl(
  "https://remoteok.com/remote-jobs/remote-frontend-engineer-bjak-1137410",
);

/**
 * The result must not be null.
 *
 * If it is null, something in the retrieval chain failed:
 *
 * OpportunityService
 * → Provider Manager
 * → Remote OK Provider
 */
if (remoteOkOpportunity === null) {
  throw new Error(
    "Expected OpportunityService to retrieve the Remote OK opportunity.",
  );
}

/**
 * Confirm that the correct provider handled the URL.
 *
 * Provider ownership should be resolved by the Provider Manager,
 * not by OpportunityService itself.
 */
if (remoteOkOpportunity.source !== "remoteok") {
  throw new Error(
    `Expected source "remoteok", received "${remoteOkOpportunity.source}".`,
  );
}

console.log(`✓ Remote OK opportunity retrieved: ${remoteOkOpportunity.title}`);

/**
 * ------------------------------------------------------------------
 * Test 2: Retrieve an opportunity from Devpost.
 * ------------------------------------------------------------------
 *
 * This verifies the same service flow for a different provider.
 *
 * The Devpost URL is a Devpost-owned subdomain, which is intentionally
 * supported by DevpostProvider.canHandleUrl().
 */
console.log("\nTest 2: Devpost getByUrl...");

const devpostOpportunity = await opportunityService.getByUrl(
  "https://revenuecat-shipaton-2026.devpost.com/",
);

/**
 * The result must not be null.
 */
if (devpostOpportunity === null) {
  throw new Error(
    "Expected OpportunityService to retrieve the Devpost hackathon.",
  );
}

/**
 * Confirm that the Devpost provider handled the URL.
 */
if (devpostOpportunity.source !== "devpost") {
  throw new Error(
    `Expected source "devpost", received "${devpostOpportunity.source}".`,
  );
}

console.log(`✓ Devpost opportunity retrieved: ${devpostOpportunity.title}`);

/**
 * ------------------------------------------------------------------
 * Test 3: Unsupported URL.
 * ------------------------------------------------------------------
 *
 * Route should not attempt to fetch arbitrary URLs.
 *
 * The Provider Manager first asks the registered providers whether
 * they can handle the URL. If none of them recognize it, the service
 * should return null.
 *
 * This is also an important security boundary because Route's
 * get_opportunity capability should only retrieve resources from
 * providers that explicitly claim ownership of their URLs.
 */
console.log("\nTest 3: Unsupported URL...");

const unsupportedOpportunity = await opportunityService.getByUrl(
  "https://example.com/opportunity",
);

/**
 * An unsupported URL must return null.
 */
if (unsupportedOpportunity !== null) {
  throw new Error("Expected an unsupported URL to return null.");
}

console.log("✓ Unsupported URL correctly returned null.");

/**
 * ------------------------------------------------------------------
 * Test 4: Save a Remote OK opportunity.
 * ------------------------------------------------------------------
 *
 * This verifies the complete save flow:
 *
 *      URL
 *       ↓
 *      OpportunityService
 *       ↓
 *      Provider Manager
 *       ↓
 *      RemoteOkProvider
 *       ↓
 *      Normalized Opportunity
 *       ↓
 *      Opportunity Store
 *       ↓
 *      DynamoDB
 *
 * The opportunity itself is stored only as a lightweight identity:
 *
 *      opportunityId
 *      url
 *
 * The relationship is then stored separately:
 *
 *      agentId
 *      opportunityId
 *      url
 *      savedAt
 */
console.log("\nTest 4: Save Remote OK opportunity...");

const firstSave = await opportunityService.saveOpportunity({
  agentId: testAgentId,
  url: remoteOkOpportunity.url,
});

/**
 * The opportunity must have been successfully resolved and saved.
 */
if (firstSave === null) {
  throw new Error("Expected the Remote OK opportunity to be saved.");
}

/**
 * This is the first save for this test agent, so the relationship
 * should not already exist.
 */
if (firstSave.alreadySaved) {
  throw new Error("Expected the first save to create a new relationship.");
}

/**
 * Confirm that the saved relationship belongs to the expected agent.
 */
if (firstSave.savedOpportunity.agentId !== testAgentId) {
  throw new Error("Saved opportunity contains an unexpected agent ID.");
}

/**
 * Confirm that the relationship uses the same canonical opportunity
 * ID produced by the provider.
 */
if (firstSave.savedOpportunity.opportunityId !== remoteOkOpportunity.id) {
  throw new Error(
    "Saved opportunity ID does not match the provider opportunity ID.",
  );
}

console.log(
  `✓ Remote OK opportunity saved: ${firstSave.savedOpportunity.opportunityId}`,
);

/**
 * ------------------------------------------------------------------
 * Test 5: Save the same opportunity again.
 * ------------------------------------------------------------------
 *
 * Saving the same opportunity for the same agent must be idempotent.
 *
 * We should not create another relationship record.
 */
console.log("\nTest 5: Duplicate save...");

const secondSave = await opportunityService.saveOpportunity({
  agentId: testAgentId,
  url: remoteOkOpportunity.url,
});

/**
 * The provider should still resolve the opportunity.
 */
if (secondSave === null) {
  throw new Error(
    "Expected the opportunity to resolve during the duplicate save.",
  );
}

/**
 * The store should detect the existing Agent → Opportunity
 * relationship.
 */
if (!secondSave.alreadySaved) {
  throw new Error("Expected the duplicate save to return alreadySaved=true.");
}

/**
 * The original relationship should be returned.
 */
if (
  secondSave.savedOpportunity.opportunityId !==
  firstSave.savedOpportunity.opportunityId
) {
  throw new Error("Duplicate save returned a different opportunity ID.");
}

console.log("✓ Duplicate save correctly detected.");

/**
 * ------------------------------------------------------------------
 * Test 6: Retrieve opportunities saved by the test agent.
 * ------------------------------------------------------------------
 *
 * This verifies that the Agent → Opportunity relationship can be
 * queried using the agent's ID.
 */
console.log("\nTest 6: Get saved opportunities for test agent...");

const savedOpportunities =
  await opportunityService.getSavedOpportunities(testAgentId);

/**
 * The test agent should have exactly one saved opportunity.
 *
 * The duplicate save above must not have created another record.
 */
if (savedOpportunities.length !== 1) {
  throw new Error(
    `Expected 1 saved opportunity, found ${savedOpportunities.length}.`,
  );
}

/**
 * Confirm that the retrieved relationship points to the same
 * opportunity we saved above.
 */
if (savedOpportunities[0]?.opportunityId !== remoteOkOpportunity.id) {
  throw new Error(
    "Retrieved saved opportunity does not match the expected opportunity.",
  );
}

console.log("✓ Test agent's saved opportunity retrieved successfully.");

/**
 * ------------------------------------------------------------------
 * Test 7: Generate an agent ID for a new agent.
 * ------------------------------------------------------------------
 *
 * A new agent does not have a ROUTE agentId yet.
 *
 * It provides its name instead.
 *
 * Route must:
 *
 * - generate a ROUTE agentId
 * - save the opportunity
 * - return the generated agentId
 *
 * The caller is then responsible for preserving that ID.
 */
console.log("\nTest 7: Generate agent ID for new agent...");

const newAgentSave = await opportunityService.saveOpportunity({
  agentName: "Service Test Research Agent",
  url: remoteOkOpportunity.url,
});

if (newAgentSave === null) {
  throw new Error("Expected the new agent to save the opportunity.");
}

/**
 * A new agent must receive a ROUTE-generated identity.
 */
if (!newAgentSave.agentId.startsWith("route_agent_")) {
  throw new Error(
    `Expected a ROUTE agent ID, received "${newAgentSave.agentId}".`,
  );
}

/**
 * The generated identity should be the identity used by the
 * saved relationship.
 */
if (newAgentSave.savedOpportunity.agentId !== newAgentSave.agentId) {
  throw new Error("Generated agent ID does not match the saved relationship.");
}

console.log(`✓ Generated agent ID: ${newAgentSave.agentId}`);

/**
 * If execution reaches this point, all service-level integration
 * tests passed successfully.
 */
console.log(
  "\n✓ All Opportunity Service integration tests passed successfully.",
);
