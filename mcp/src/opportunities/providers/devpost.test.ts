import { DevpostProvider } from "./devpost.js";

import { opportunityPreparationContextSchema } from "../preparation/schema.js";

/**
 * Manual Devpost provider test.
 *
 * Verifies:
 *
 * 1. search()
 * 2. pagination
 * 3. keyword filtering
 * 4. getByUrl()
 * 5. invalid URL handling
 * 6. getPreparationContext()
 * 7. preparation context schema validation
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

  console.log("\n=== TEST 4: getByUrl() ===");

  const firstHackathon = defaultResult.opportunities[0];

  console.log("First hackathon:", firstHackathon);

  if (!firstHackathon) {
    console.log("No hackathons returned from search.");
  } else {
    console.log("Testing URL:");
    console.log(firstHackathon.url);

    const retrievedHackathon = await provider.getByUrl(firstHackathon.url);

    console.log("Retrieved hackathon:", retrievedHackathon);

    /**
     * -------------------------------------------------------------
     * Preparation context test
     * -------------------------------------------------------------
     *
     * We only continue if getByUrl() successfully resolved
     * the opportunity.
     *
     * This mirrors the actual Route architecture:
     *
     * getByUrl()
     *     ↓
     * Opportunity
     *     ↓
     * getPreparationContext()
     */
    if (!retrievedHackathon) {
      throw new Error("Expected Devpost getByUrl() to return an opportunity.");
    }

    console.log("\n=== TEST 5: getPreparationContext() ===");

    const preparationContext =
      await provider.getPreparationContext(retrievedHackathon);

    console.log(
      "Preparation context:",
      JSON.stringify(preparationContext, null, 2),
    );

    /**
     * Validate the complete result against the runtime
     * preparation contract.
     *
     * This proves that the provider is returning the shape
     * Route promised to connected agents.
     */
    const validation =
      opportunityPreparationContextSchema.safeParse(preparationContext);

    if (!validation.success) {
      console.error(
        "Preparation context validation failed:",
        validation.error.format(),
      );

      throw new Error("Devpost preparation context failed schema validation.");
    }

    console.log("✓ Devpost preparation context passed schema validation.");

    /**
     * Basic behavioral checks.
     *
     * These are intentionally simple and source-backed.
     */
    if (preparationContext.opportunity.id !== retrievedHackathon.id) {
      throw new Error("Preparation context contains a different opportunity.");
    }

    if (preparationContext.source.provider !== "devpost") {
      throw new Error("Preparation context has an unexpected provider.");
    }

    if (!preparationContext.source.retrievedAt) {
      throw new Error("Preparation context is missing retrievedAt.");
    }

    console.log("✓ Opportunity identity preserved.");

    console.log("✓ Provider provenance preserved.");

    console.log("✓ Retrieval timestamp present.");

    /**
     * Themes should have been mapped into categories
     * when Devpost supplied them.
     */
    const themes = retrievedHackathon.metadata?.themes;

    const categories = preparationContext.preparation.categories;

    if (Array.isArray(themes) && themes.length > 0) {
      if (!categories || categories.length === 0) {
        throw new Error(
          "Devpost themes were not mapped to preparation categories.",
        );
      }

      console.log("✓ Devpost themes mapped to preparation categories.");
    } else {
      console.log("No Devpost themes available to validate.");
    }

    /**
     * The existing normalized description should be
     * preserved as source content.
     */
    if (retrievedHackathon.description) {
      const sourceContent = preparationContext.sourceContent;

      if (!sourceContent || sourceContent.length === 0) {
        throw new Error(
          "Expected sourceContent to contain the opportunity description.",
        );
      }

      if (sourceContent[0]?.content !== retrievedHackathon.description) {
        throw new Error(
          "Preparation source content does not preserve the opportunity description.",
        );
      }

      console.log("✓ Opportunity description preserved in sourceContent.");
    }

    /**
     * Submission URL should be preserved when Devpost
     * provides one.
     */
    const submissionUrl = retrievedHackathon.metadata?.startSubmissionUrl;

    if (typeof submissionUrl === "string") {
      if (
        preparationContext.preparation.submission?.submissionUrl !==
        submissionUrl
      ) {
        throw new Error("Devpost submission URL was not preserved.");
      }

      console.log("✓ Submission URL preserved.");
    } else {
      console.log("No submission URL available to validate.");
    }
  }

  console.log("\n=== TEST 6: Invalid URL ===");

  const invalidUrlResult = await provider.getByUrl("https://google.com");

  console.log("Result:", invalidUrlResult);

  if (invalidUrlResult !== null) {
    throw new Error("Expected invalid/non-Devpost URL to return null.");
  }

  console.log("✓ Invalid URL correctly returned null.");

  console.log("\n=== TEST 7: Non-existent Devpost URL ===");

  const missingHackathonResult = await provider.getByUrl(
    "https://devpost.com/software/route-does-not-exist-999999999",
  );

  console.log("Result:", missingHackathonResult);

  if (missingHackathonResult !== null) {
    throw new Error(
      "Expected non-existent Devpost opportunity to return null.",
    );
  }

  console.log("✓ Non-existent Devpost opportunity correctly returned null.");

  console.log("\n✓ DEVPOST PROVIDER TEST PASSED.");
}

main().catch((error) => {
  /**
   * Surface unexpected failures clearly during
   * manual development/testing.
   */
  console.error("Devpost provider test failed:", error);

  process.exit(1);
});
