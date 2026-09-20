import { DevpostProvider } from "./devpost.js";

/**
 * Simple manual test for the Devpost provider.
 *
 * This file is intentionally separate from the actual provider
 * implementation so we can verify the provider against the real
 * Devpost API without involving the MCP server yet.
 */
async function main() {
  const provider = new DevpostProvider();

  console.log("=== TEST 1: Default search ===");

  const defaultResult = await provider.search({
    limit: 10,
  });

  console.log(`Found ${defaultResult.opportunities.length} hackathons`);

  for (const opportunity of defaultResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.organization}`);
  }

  console.log("Next cursor:", defaultResult.nextCursor ?? "none");

  console.log("\n=== TEST 2: AI hackathons ===");

  const aiResult = await provider.search({
    keyword: "AI",
    limit: 10,
  });

  console.log(`Found ${aiResult.opportunities.length} AI hackathons`);

  for (const opportunity of aiResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.organization}`);
  }

  console.log("Next cursor:", aiResult.nextCursor ?? "none");

  console.log("\n=== TEST 3: Continuation ===");

  /**
   * If the previous search produced a cursor,
   * use it to continue from the next Devpost page.
   */
  if (aiResult.nextCursor) {
    const continuationResult = await provider.search({
      keyword: "AI",
      limit: 10,
      cursor: aiResult.nextCursor,
    });

    console.log(
      `Found ${continuationResult.opportunities.length} more AI hackathons`,
    );

    for (const opportunity of continuationResult.opportunities) {
      console.log(`- ${opportunity.title} | ${opportunity.organization}`);
    }

    console.log("Next cursor:", continuationResult.nextCursor ?? "none");
  } else {
    console.log("No continuation cursor was returned.");
  }
}

main().catch((error) => {
  console.error("Devpost provider test failed:", error);

  process.exit(1);
});
