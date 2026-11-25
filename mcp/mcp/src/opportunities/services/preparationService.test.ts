/**
 * Preparation Service Integration Test
 *
 * This file verifies that the PreparationService correctly coordinates
 * opportunity retrieval and preparation-context retrieval through the
 * Provider Manager.
 *
 * The service itself intentionally contains very little provider-specific
 * logic:
 *
 *      PreparationService
 *              ↓
 *      OpportunityProviderManager
 *              ↓
 *      Matching Provider
 *              ↓
 *      External Source
 *
 * The Provider Manager is responsible for resolving which provider owns
 * the opportunity URL. The provider is then responsible for retrieving
 * and organizing the preparation context.
 *
 * Because the Provider Manager and individual providers already have
 * their own tests, this test focuses on the integration between the
 * Preparation Service and the Provider Manager.
 *
 * Test cases:
 *
 * 1. Retrieve preparation context for a Remote OK opportunity.
 * 2. Retrieve preparation context for a Devpost hackathon.
 * 3. Return null for an unsupported URL.
 *
 * This is intentionally a simple executable test rather than a full
 * testing-framework setup. Route currently uses small executable
 * integration tests while the architecture is being built.
 */

import { PreparationService } from "./preparationService.js";

/**
 * Create the service using Route's default Provider Manager.
 *
 * PreparationService creates the default Provider Manager when no manager
 * is provided. This gives us the same provider configuration that the
 * application will use.
 */
const preparationService = new PreparationService();

/**
 * Test 1: Prepare a Remote OK opportunity.
 *
 * This verifies that:
 *
 * - PreparationService accepts the opportunity URL.
 * - Provider Manager recognizes the Remote OK URL.
 * - RemoteOkProvider retrieves the opportunity.
 * - RemoteOkProvider builds the preparation context.
 * - The preparation context preserves the original opportunity data.
 */
console.log("Test 1: Remote OK prepareOpportunity...");

const remoteOkPreparation = await preparationService.prepareOpportunity(
  "https://remoteok.com/remote-jobs/remote-frontend-engineer-bjak-1137410",
);

/**
 * The preparation context must not be null.
 *
 * If it is null, something in the preparation chain failed:
 *
 * PreparationService
 * → Provider Manager
 * → Remote OK Provider
 * → External Source
 */
if (remoteOkPreparation === null) {
  throw new Error(
    "Expected PreparationService to retrieve Remote OK preparation context.",
  );
}

/**
 * Confirm that the correct provider handled the URL.
 *
 * PreparationService itself should not contain provider-specific logic.
 * Provider ownership is resolved by the Provider Manager.
 */
if (remoteOkPreparation.source.provider !== "remoteok") {
  throw new Error(
    `Expected source provider "remoteok", received "${remoteOkPreparation.source.provider}".`,
  );
}

/**
 * Confirm that the preparation context contains the normalized
 * opportunity returned by the provider.
 */
if (remoteOkPreparation.opportunity.source !== "remoteok") {
  throw new Error(
    `Expected opportunity source "remoteok", received "${remoteOkPreparation.opportunity.source}".`,
  );
}

/**
 * The Remote OK preparation implementation preserves the original
 * opportunity description as source content.
 *
 * This verifies that preparation does not replace the source information
 * with only structured fields.
 */
if (
  !remoteOkPreparation.sourceContent ||
  remoteOkPreparation.sourceContent.length === 0
) {
  throw new Error(
    "Expected Remote OK preparation context to contain source content.",
  );
}

console.log(
  `✓ Remote OK preparation retrieved: ${remoteOkPreparation.opportunity.title}`,
);

/**
 * Test 2: Prepare a Devpost hackathon.
 *
 * This verifies the same preparation flow using a different provider.
 *
 * The Devpost URL is a Devpost-owned subdomain, which is intentionally
 * supported by DevpostProvider.canHandleUrl().
 */
console.log("\nTest 2: Devpost prepareOpportunity...");

const devpostPreparation = await preparationService.prepareOpportunity(
  "https://revenuecat-shipaton-2026.devpost.com/",
);

/**
 * The preparation context must not be null.
 */
if (devpostPreparation === null) {
  throw new Error(
    "Expected PreparationService to retrieve Devpost preparation context.",
  );
}

/**
 * Confirm that the Devpost provider handled the URL.
 */
if (devpostPreparation.source.provider !== "devpost") {
  throw new Error(
    `Expected source provider "devpost", received "${devpostPreparation.source.provider}".`,
  );
}

/**
 * Confirm that the normalized opportunity also belongs to Devpost.
 */
if (devpostPreparation.opportunity.source !== "devpost") {
  throw new Error(
    `Expected opportunity source "devpost", received "${devpostPreparation.opportunity.source}".`,
  );
}

/**
 * Devpost preparation should contain source content because the provider
 * retrieves the challenge page and preserves both the original opportunity
 * description and the richer overview content.
 */
if (
  !devpostPreparation.sourceContent ||
  devpostPreparation.sourceContent.length === 0
) {
  throw new Error(
    "Expected Devpost preparation context to contain source content.",
  );
}

console.log(
  `✓ Devpost preparation retrieved: ${devpostPreparation.opportunity.title}`,
);

/**
 * Test 3: Unsupported URL.
 *
 * Route should not attempt to prepare arbitrary URLs.
 *
 * The Provider Manager asks the registered providers whether they own
 * the URL. If no provider recognizes it, PreparationService should
 * return null.
 *
 * This preserves the same provider ownership and security boundary
 * used by get_opportunity.
 */
console.log("\nTest 3: Unsupported URL...");

const unsupportedPreparation = await preparationService.prepareOpportunity(
  "https://example.com/opportunity",
);

/**
 * An unsupported URL must return null.
 */
if (unsupportedPreparation !== null) {
  throw new Error("Expected an unsupported URL to return null.");
}

console.log("✓ Unsupported URL correctly returned null.");

/**
 * If execution reaches this point, all preparation-service integration
 * tests passed successfully.
 */
console.log("\n✓ All Preparation Service tests passed successfully.");
