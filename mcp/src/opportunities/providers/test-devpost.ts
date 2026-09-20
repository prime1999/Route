import { DevpostProvider } from "./devpost.js";

/**
 * Create the Devpost provider directly.
 *
 * This lets us test the provider independently from the MCP
 * server. That makes debugging much easier because if something
 * fails, we know the problem is inside the provider rather than
 * somewhere in the MCP layer.
 */
const provider = new DevpostProvider();

/**
 * Run a small collection of provider tests.
 */
async function main() {
  /**
   * ---------------------------------------------------------
   * TEST 1: Default search
   * ---------------------------------------------------------
   *
   * No limit is supplied, so the provider should use its
   * default limit of 10.
   */
  console.log("\n=== TEST 1: Default search ===");

  const defaultResults = await provider.search({
    type: "hackathon",
  });

  console.log(`Found ${defaultResults.length} hackathons.`);

  defaultResults.forEach((opportunity, index) => {
    console.log(`${index + 1}. ${opportunity.title}`);
  });

  /**
   * ---------------------------------------------------------
   * TEST 2: Keyword search
   * ---------------------------------------------------------
   *
   * This verifies that the provider can search through
   * relevant fields such as title, organization, description,
   * and themes.
   */
  console.log("\n=== TEST 2: AI keyword ===");

  const aiResults = await provider.search({
    type: "hackathon",
    keyword: "AI",
    limit: 10,
  });

  console.log(`Found ${aiResults.length} AI-related hackathons.`);

  aiResults.forEach((opportunity, index) => {
    console.log(`${index + 1}. ${opportunity.title}`);

    console.log(`   Organization: ${opportunity.organization}`);

    console.log(`   Remote: ${opportunity.remote}`);

    console.log(`   Prize: ${opportunity.prize ?? "N/A"}`);
  });

  /**
   * ---------------------------------------------------------
   * TEST 3: Remote + keyword + larger limit
   * ---------------------------------------------------------
   *
   * This is particularly important because it tests the
   * pagination behavior.
   *
   * If the first Devpost page does not contain enough matching
   * online AI hackathons, Route should automatically request
   * additional pages.
   */
  console.log("\n=== TEST 3: Remote AI hackathons ===");

  const remoteAiResults = await provider.search({
    type: "hackathon",
    keyword: "AI",
    remote: true,
    limit: 20,
  });

  console.log(`Found ${remoteAiResults.length} remote AI hackathons.`);

  remoteAiResults.forEach((opportunity, index) => {
    console.log(`${index + 1}. ${opportunity.title}`);

    console.log(`   Location: ${opportunity.location ?? "N/A"}`);

    console.log(`   Remote: ${opportunity.remote}`);
  });

  /**
   * ---------------------------------------------------------
   * TEST 4: Verify normalized metadata
   * ---------------------------------------------------------
   *
   * Print one complete opportunity so we can inspect whether
   * fields such as registrations, themes, prizes, and URLs
   * were normalized correctly.
   */
  console.log("\n=== TEST 4: Normalized opportunity ===");

  if (remoteAiResults.length > 0) {
    console.dir(remoteAiResults[2], {
      depth: null,
    });
  } else {
    console.log("No result available to inspect.");
  }
}

/**
 * Execute the tests.
 *
 * Any provider error is surfaced clearly instead of silently
 * failing.
 */
main().catch((error) => {
  console.error("\nDevpost provider test failed:");

  console.error(error);

  process.exit(1);
});
