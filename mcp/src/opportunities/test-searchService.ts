import { OpportunitySearchService } from "./searchService.js";

/**
 * Search Service integration test.
 *
 * This test deliberately exercises the Search Service rather than
 * calling Remote OK or Devpost directly.
 *
 * The goal is to verify that Route can:
 *
 * 1. Search across providers.
 * 2. Respect the global result limit.
 * 3. Return a Route-level continuation cursor.
 * 4. Use that cursor to continue the search.
 * 5. Avoid returning the same results from the previous request.
 *
 * This is especially important now that Remote OK uses position-based
 * pagination while Devpost uses its own native page-based pagination.
 */

const searchService = new OpportunitySearchService();

console.log("=== TEST 1: First search ===");

const firstPage = await searchService.search({
  keyword: "AI",
  type: "all",
  limit: 5,
});

/**
 * Display the first batch returned by the Search Service.
 *
 * Notice that we are intentionally not calling a provider directly.
 * This verifies the layer that will eventually sit behind our MCP tool.
 */
console.log(`Found ${firstPage.opportunities.length} results`);

firstPage.opportunities.forEach((opportunity, index) => {
  console.log(`${index + 1}. ${opportunity.title} | ${opportunity.source}`);
});

console.log("First page cursor:", firstPage.nextCursor);

if (!firstPage.nextCursor) {
  console.log("\nNo continuation cursor was returned.");

  process.exit(0);
}

console.log("\n=== TEST 2: Continuation ===");

/**
 * The second request uses the cursor returned by Route.
 *
 * The Search Service is responsible for decoding this cursor
 * and passing the appropriate provider-specific cursors back
 * to the Provider Manager.
 */
const secondPage = await searchService.search({
  keyword: "AI",
  type: "all",
  limit: 5,
  cursor: firstPage.nextCursor,
});

console.log(`Found ${secondPage.opportunities.length} results`);

secondPage.opportunities.forEach((opportunity, index) => {
  console.log(`${index + 1}. ${opportunity.title} | ${opportunity.source}`);
});

console.log("Second page cursor:", secondPage.nextCursor);

/**
 * Compare the IDs from both pages.
 *
 * We do not want the second page to simply repeat the
 * opportunities that were already returned on page one.
 */
const firstPageIds = new Set(
  firstPage.opportunities.map((opportunity) => opportunity.id),
);

const duplicateResults = secondPage.opportunities.filter((opportunity) =>
  firstPageIds.has(opportunity.id),
);

console.log("\nDuplicate results between pages:", duplicateResults.length);

if (duplicateResults.length === 0) {
  console.log("Pagination check: PASSED");
} else {
  console.log("Pagination check: FAILED");

  duplicateResults.forEach((opportunity) => {
    console.log(`- ${opportunity.title} | ${opportunity.source}`);
  });
}
