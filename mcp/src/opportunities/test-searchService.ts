/**
 * Search Service Integration Test
 * --------------------------------
 *
 * This file tests the behavior of the Route Search Service as a whole.
 *
 * We are intentionally testing the Search Service rather than individual
 * providers here because the Search Service owns Route's user-facing
 * search semantics.
 *
 * The providers are responsible for:
 * - fetching provider data
 * - filtering provider data
 * - normalizing provider data
 * - handling provider-specific pagination
 *
 * The Search Service is responsible for:
 * - applying Route's result-limit semantics
 * - handling the "all" search scope
 * - combining provider results
 * - deduplicating opportunities
 * - encoding/decoding the Route cursor
 * - continuing searches across multiple pages
 *
 * This test therefore acts as a contract test for the Search Service.
 */

import { OpportunitySearchService } from "./searchService.js";

/**
 * Small helper used throughout the tests.
 *
 * It extracts the IDs from a result so that we can easily compare
 * pages and detect duplicate opportunities.
 */
function getIds(ids: { id: string }[]): string[] {
  return ids.map((opportunity) => opportunity.id);
}

/**
 * Small helper for displaying test results.
 *
 * Keeping the output consistent makes it easier to inspect the
 * behavior when running the test manually.
 */
function printResults(
  label: string,
  opportunities: {
    id: string;
    title: string;
    type: string;
    source: string;
  }[],
): void {
  console.log(`\n${label}`);
  console.log(`Found ${opportunities.length} results`);

  for (const opportunity of opportunities) {
    console.log(
      `- ${opportunity.title} | ${opportunity.type} | ${opportunity.source}`,
    );
  }
}

/**
 * Counts opportunities belonging to a particular type.
 *
 * This is important for the new "all" behavior.
 *
 * With:
 *
 *   type: "all"
 *   limit: 5
 *
 * Route should return:
 *
 *   up to 5 jobs
 *   up to 5 hackathons
 *
 * rather than applying a global limit of 5 across both types.
 */
function countByType(
  opportunities: {
    type: string;
  }[],
): Record<string, number> {
  return opportunities.reduce(
    (counts, opportunity) => {
      counts[opportunity.type] = (counts[opportunity.type] ?? 0) + 1;

      return counts;
    },
    {} as Record<string, number>,
  );
}

/**
 * Checks whether two arrays contain any duplicate IDs.
 *
 * We use this when testing pagination.
 *
 * Page 2 should continue after Page 1 rather than returning
 * opportunities that were already shown to the caller.
 */
function findDuplicates(firstPage: string[], secondPage: string[]): string[] {
  const firstPageIds = new Set(firstPage);

  return secondPage.filter((id) => firstPageIds.has(id));
}

/**
 * Main test runner.
 *
 * This is intentionally a single executable test file rather than
 * a testing-framework suite for now. That keeps the project simple
 * while the Search Service contract is still being established.
 *
 * Once the Route architecture stabilizes, these tests can be moved
 * into a formal test runner such as Vitest.
 */
async function main(): Promise<void> {
  const searchService = new OpportunitySearchService();

  console.log("========================================");
  console.log("Route Search Service Tests");
  console.log("========================================");

  /**
   * ---------------------------------------------------------------
   * TEST 1: JOB SEARCH
   * ---------------------------------------------------------------
   *
   * A job search with limit 5 should return no more than 5 jobs.
   */
  console.log("\n=== TEST 1: Jobs ===");

  const jobResult = await searchService.search({
    type: "job",
    keyword: "AI",
    limit: 5,
  });

  printResults("Job search results", jobResult.opportunities);

  const jobCounts = countByType(jobResult.opportunities);

  if ((jobCounts.job ?? 0) > 5) {
    throw new Error("Job search returned more than the requested limit of 5.");
  }

  console.log("Job limit check: PASSED");

  /**
   * ---------------------------------------------------------------
   * TEST 2: HACKATHON SEARCH
   * ---------------------------------------------------------------
   *
   * A hackathon search with limit 5 should return no more than
   * 5 hackathons.
   */
  console.log("\n=== TEST 2: Hackathons ===");

  const hackathonResult = await searchService.search({
    type: "hackathon",
    keyword: "AI",
    limit: 5,
  });

  printResults("Hackathon search results", hackathonResult.opportunities);

  const hackathonCounts = countByType(hackathonResult.opportunities);

  if ((hackathonCounts.hackathon ?? 0) > 5) {
    throw new Error(
      "Hackathon search returned more than the requested limit of 5.",
    );
  }

  console.log("Hackathon limit check: PASSED");

  /**
   * ---------------------------------------------------------------
   * TEST 3: ALL OPPORTUNITIES
   * ---------------------------------------------------------------
   *
   * This is the most important test for the new Search Service
   * behavior.
   *
   * limit: 5 does NOT mean:
   *
   *   5 total opportunities
   *
   * Instead, because the search type is "all", it means:
   *
   *   up to 5 jobs
   *   up to 5 hackathons
   *
   * Therefore the total can be as high as 10.
   */
  console.log("\n=== TEST 3: All Opportunities ===");

  const allResult = await searchService.search({
    type: "all",
    keyword: "AI",
    limit: 5,
  });

  printResults("All opportunity results", allResult.opportunities);

  const allCounts = countByType(allResult.opportunities);

  console.log("\nResults by type:", allCounts);

  if ((allCounts.job ?? 0) > 5) {
    throw new Error(`"all" search returned more than 5 jobs: ${allCounts.job}`);
  }

  if ((allCounts.hackathon ?? 0) > 5) {
    throw new Error(
      `"all" search returned more than 5 hackathons: ${allCounts.hackathon}`,
    );
  }

  console.log("Per-type limit check: PASSED");

  /**
   * ---------------------------------------------------------------
   * TEST 4: ALL SEARCH PAGINATION
   * ---------------------------------------------------------------
   *
   * This verifies that the Route cursor can continue the search
   * across provider streams.
   *
   * The first page should contain results from both supported
   * opportunity types whenever both providers have matching data.
   *
   * The second page should continue from the provider cursors
   * returned by the first page.
   */
  console.log("\n=== TEST 4: All Search Pagination ===");

  if (!allResult.nextCursor) {
    console.log("No next cursor returned from the first page.");

    console.log(
      "Pagination test skipped because the providers returned no additional page.",
    );
  } else {
    const secondAllResult = await searchService.search({
      type: "all",
      keyword: "AI",
      limit: 5,
      cursor: allResult.nextCursor,
    });

    printResults(
      "Second all-opportunities page",
      secondAllResult.opportunities,
    );

    const firstPageIds = getIds(allResult.opportunities);

    const secondPageIds = getIds(secondAllResult.opportunities);

    const duplicates = findDuplicates(firstPageIds, secondPageIds);

    console.log("\nFirst page IDs:", firstPageIds);

    console.log("Second page IDs:", secondPageIds);

    console.log("Duplicate IDs:", duplicates);

    if (duplicates.length > 0) {
      throw new Error(
        `Pagination returned duplicate opportunities: ${duplicates.join(", ")}`,
      );
    }

    console.log("Cross-page duplicate check: PASSED");

    /**
     * Check the per-type limit on page 2 as well.
     *
     * Pagination should not change the meaning of limit.
     */
    const secondPageCounts = countByType(secondAllResult.opportunities);

    if ((secondPageCounts.job ?? 0) > 5) {
      throw new Error("Second page returned more than 5 jobs.");
    }

    if ((secondPageCounts.hackathon ?? 0) > 5) {
      throw new Error("Second page returned more than 5 hackathons.");
    }

    console.log("Second-page per-type limit check: PASSED");
  }

  /**
   * ---------------------------------------------------------------
   * TEST 5: CURSOR CONTINUATION
   * ---------------------------------------------------------------
   *
   * This test is slightly more structural.
   *
   * When "all" is requested, Route may need to continue more than
   * one provider at the same time.
   *
   * We therefore expect the cursor to be usable for another search.
   *
   * We do not inspect the cursor's internal format here.
   *
   * That is intentional.
   *
   * The cursor is an opaque value to callers. The caller should not
   * need to know whether it contains:
   *
   *   remoteok:5
   *   devpost:2
   *   or something else in the future.
   *
   * The Search Service owns that implementation detail.
   */
  console.log("\n=== TEST 5: Cursor Continuation ===");

  if (allResult.nextCursor) {
    const continuationResult = await searchService.search({
      type: "all",
      keyword: "AI",
      limit: 5,
      cursor: allResult.nextCursor,
    });

    console.log(
      "Cursor continuation returned:",
      continuationResult.opportunities.length,
      "results",
    );

    console.log("Cursor continuation check: PASSED");
  } else {
    console.log("Cursor continuation skipped because no cursor was returned.");
  }

  /**
   * ---------------------------------------------------------------
   * FINAL SUMMARY
   * ---------------------------------------------------------------
   */
  console.log("\n========================================");
  console.log("ALL SEARCH SERVICE TESTS PASSED");
  console.log("========================================");
}

/**
 * Execute the tests.
 *
 * Errors are intentionally allowed to reach the process boundary.
 * If any assertion above throws, Node will exit with a non-zero
 * status, making the failure obvious in the terminal and suitable
 * for future CI integration.
 */
main().catch((error: unknown) => {
  console.error("\nSearch Service tests failed:");

  console.error(error);

  process.exit(1);
});
