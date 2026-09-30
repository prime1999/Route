/**
 * Opportunity Service Integration Test
 *
 * This file verifies that the OpportunityService correctly delegates
 * single-opportunity retrieval to the Provider Manager.
 *
 * The service itself intentionally contains very little logic:
 *
 *      OpportunityService
 *              ↓
 *      OpportunityProviderManager
 *              ↓
 *      Matching Provider
 *              ↓
 *      External Source
 *
 * Because the Provider Manager and individual providers already have
 * their own tests, this test focuses on the integration between the
 * Opportunity Service and the Provider Manager.
 *
 * Test cases:
 *
 * 1. Retrieve a Remote OK opportunity by URL.
 * 2. Retrieve a Devpost hackathon by URL.
 * 3. Return null for an unsupported URL.
 *
 * This is intentionally a simple executable test rather than a full
 * testing-framework setup. Route currently uses small executable
 * integration tests while the architecture is being built.
 */

import { OpportunityService } from "./opportunityService.js";

/**
 * Create the service using Route's default Provider Manager.
 *
 * The OpportunityService creates the default manager when no manager
 * is provided, so this gives us the same provider configuration that
 * the application will use.
 */
const opportunityService = new OpportunityService();

/**
 * Test 1: Retrieve an opportunity from Remote OK.
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
 * This is important because the service itself should not contain
 * provider-specific logic. Provider ownership should be resolved
 * by the Provider Manager.
 */
if (remoteOkOpportunity.source !== "remoteok") {
  throw new Error(
    `Expected source "remoteok", received "${remoteOkOpportunity.source}".`,
  );
}

console.log(`✓ Remote OK opportunity retrieved: ${remoteOkOpportunity.title}`);

/**
 * Test 2: Retrieve an opportunity from Devpost.
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
console.log(
  "✓ Devpost opportunity retrieved:",
  JSON.stringify(devpostOpportunity, null, 2),
);
console.log(`✓ Devpost opportunity retrieved: ${devpostOpportunity.title}`);

/**
 * Test 3: Unsupported URL.
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
 * If execution reaches this point, all service-level retrieval
 * integration tests passed.
 */
console.log("\n✓ All Opportunity Service tests passed successfully.");
