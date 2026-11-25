import { OpportunityProviderManager } from "./manager.js";

/**
 * Manual test for the Opportunity Provider Manager.
 *
 * The manager sits above the individual providers and decides:
 * - which providers should receive search requests
 * - which provider owns a direct opportunity URL
 * - when to delegate direct retrieval to that provider
 *
 * This test file intentionally exercises the manager rather than
 * the individual providers directly.
 *
 * Provider-specific retrieval behavior is already tested in the
 * provider test files. Here we are testing that the Manager routes
 * the request to the correct provider.
 */
async function main() {
  /**
   * Create the default Provider Manager.
   *
   * This registers the currently supported providers:
   *
   * - Remote OK
   * - Devpost
   */
  const manager = new OpportunityProviderManager();

  console.log("=== TEST 1: Hackathons ===");

  /**
   * Test provider selection by opportunity type.
   *
   * Only providers supporting "hackathon" should participate.
   */
  const hackathonResult = await manager.search({
    type: "hackathon",
    keyword: "AI",
    limit: 5,
  });

  console.log(`Found ${hackathonResult.opportunities.length} results`);

  for (const opportunity of hackathonResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.source}`);
  }

  console.log("Provider cursors:", hackathonResult.cursors);

  console.log("\n=== TEST 2: Jobs ===");

  /**
   * Test provider selection for jobs.
   *
   * Only providers supporting "job" should participate.
   */
  const jobResult = await manager.search({
    type: "job",
    keyword: "typescript",
    limit: 5,
  });

  console.log(`Found ${jobResult.opportunities.length} results`);

  for (const opportunity of jobResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.source}`);
  }

  console.log("Provider cursors:", jobResult.cursors);

  console.log("\n=== TEST 3: All providers ===");

  /**
   * Test a search where multiple providers participate.
   *
   * Since no explicit type is provided, the manager should
   * allow all registered providers to participate.
   */
  const allResult = await manager.search({
    keyword: "AI",
    limit: 5,
  });

  console.log(`Found ${allResult.opportunities.length} results`);

  for (const opportunity of allResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.source}`);
  }

  console.log("Provider cursors:", allResult.cursors);

  console.log("\n=== TEST 4: Registered providers ===");

  /**
   * Confirm which providers are currently registered
   * with the manager.
   */
  for (const provider of manager.getProviders()) {
    console.log(`- ${provider.name}: ${provider.supportedTypes.join(", ")}`);
  }

  console.log("\n=== TEST 5: Remote OK getByUrl ===");

  /**
   * Test direct URL ownership and retrieval through
   * the Provider Manager.
   *
   * The Manager should:
   *
   * 1. Ask the registered providers who owns the URL.
   * 2. RemoteOkProvider should claim it.
   * 3. The Manager should delegate to RemoteOkProvider.
   * 4. RemoteOkProvider should retrieve and normalize it.
   */
  const remoteOkUrl =
    "https://remoteok.com/remote-jobs/remote-frontend-engineer-bjak-1137410";

  const remoteOkOpportunity = await manager.getByUrl(remoteOkUrl);

  if (!remoteOkOpportunity) {
    throw new Error("Remote OK opportunity was not found.");
  }

  console.log(`Found: ${remoteOkOpportunity.title}`);

  console.log(`Source: ${remoteOkOpportunity.source}`);

  console.log(`Type: ${remoteOkOpportunity.type}`);

  /**
   * The important assertion here is that the Manager
   * routed the URL to the Remote OK provider.
   */
  if (remoteOkOpportunity.source !== "remoteok") {
    throw new Error(
      `Expected Remote OK source, received "${remoteOkOpportunity.source}".`,
    );
  }

  console.log("Remote OK URL routing passed.");

  console.log("\n=== TEST 6: Devpost getByUrl ===");

  /**
   * Test direct URL ownership and retrieval for Devpost.
   *
   * This also verifies that the Manager correctly handles
   * Devpost-owned subdomains.
   */
  const devpostUrl = "https://revenuecat-shipaton-2026.devpost.com/";

  const devpostOpportunity = await manager.getByUrl(devpostUrl);

  if (!devpostOpportunity) {
    throw new Error("Devpost opportunity was not found.");
  }

  console.log(`Found: ${devpostOpportunity.title}`);

  console.log(`Source: ${devpostOpportunity.source}`);

  console.log(`Type: ${devpostOpportunity.type}`);

  /**
   * The important assertion here is that the Manager
   * routed the URL to the Devpost provider.
   */
  if (devpostOpportunity.source !== "devpost") {
    throw new Error(
      `Expected Devpost source, received "${devpostOpportunity.source}".`,
    );
  }

  console.log("Devpost URL routing passed.");

  console.log("\n=== TEST 7: Unsupported URL ===");

  /**
   * Test a URL that none of the registered providers owns.
   *
   * The Manager should not attempt to fetch it.
   * It should simply return null because no provider claims
   * ownership of the URL.
   */
  const unsupportedUrl = "https://example.com/opportunity";

  const unsupportedOpportunity = await manager.getByUrl(unsupportedUrl);

  if (unsupportedOpportunity !== null) {
    throw new Error("Expected unsupported URL to return null.");
  }

  console.log("Unsupported URL correctly returned null.");

  console.log("\nAll Provider Manager tests passed.");
}

/**
 * Run the manual test suite.
 *
 * Any unexpected error is logged and causes the process
 * to exit with a failure status.
 */
main().catch((error) => {
  console.error("Provider manager test failed:", error);

  process.exit(1);
});
