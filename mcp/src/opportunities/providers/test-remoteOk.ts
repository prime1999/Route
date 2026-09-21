import { RemoteOkProvider } from "./remoteOk.js";

/**
 * Simple manual test for the Remote OK provider.
 *
 * This verifies that Route's locally implemented
 * position-based pagination actually produces different
 * result sets across consecutive requests.
 */
async function main() {
  const provider = new RemoteOkProvider();

  /**
   * First request.
   *
   * No cursor means we start at position zero.
   */
  console.log("=== TEST 1: First page ===");

  const firstPage = await provider.search({
    keyword: "AI",
    type: "job",
    limit: 5,
  });

  console.log(`Found ${firstPage.opportunities.length} results`);

  firstPage.opportunities.forEach((opportunity, index) => {
    console.log(`${index + 1}. ${opportunity.title}`);
  });

  console.log("Next cursor:", firstPage.nextCursor);

  /**
   * Stop if there are no additional results.
   */
  if (!firstPage.nextCursor) {
    console.log("\nNo second page is available.");

    return;
  }

  /**
   * Second request.
   *
   * We pass the cursor returned by the first request.
   *
   * The provider should now start from the position
   * immediately after the first batch.
   */
  console.log("\n=== TEST 2: Second page ===");

  const secondPage = await provider.search({
    keyword: "AI",
    type: "job",
    limit: 5,
    cursor: firstPage.nextCursor,
  });

  console.log(`Found ${secondPage.opportunities.length} results`);

  secondPage.opportunities.forEach((opportunity, index) => {
    console.log(`${index + 1}. ${opportunity.title}`);
  });

  console.log("Next cursor:", secondPage.nextCursor);
}

main().catch((error) => {
  /**
   * Surface unexpected failures clearly during
   * manual development/testing.
   */
  console.error("Remote OK test failed:", error);

  process.exit(1);
});
