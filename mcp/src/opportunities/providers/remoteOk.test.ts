import { RemoteOkProvider } from "./remoteOk.js";

import { opportunityPreparationContextSchema } from "../preparation/schema.js";

/**
 * Manual test for the Remote OK provider.
 *
 * This verifies:
 *
 * 1. Search
 * 2. Position-based pagination
 * 3. getByUrl()
 * 4. getPreparationContext()
 * 5. Preparation context schema validation
 */
async function main() {
  const provider = new RemoteOkProvider();

  /**
   * -------------------------------------------------------------
   * TEST 1: First page
   * -------------------------------------------------------------
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

  console.log("opportunities:", firstPage.opportunities);

  firstPage.opportunities.forEach((opportunity, index) => {
    console.log(`${index + 1}. ${opportunity.title}`);
  });

  console.log("Next cursor:", firstPage.nextCursor ?? "none");

  /**
   * -------------------------------------------------------------
   * TEST 2: Second page
   * -------------------------------------------------------------
   *
   * We pass the cursor returned by the first request.
   *
   * The provider should now start from the position
   * immediately after the first batch.
   */
  if (!firstPage.nextCursor) {
    console.log("\nNo second page is available.");
  } else {
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

    console.log("Next cursor:", secondPage.nextCursor ?? "none");
  }

  /**
   * -------------------------------------------------------------
   * TEST 3: getByUrl()
   * -------------------------------------------------------------
   *
   * This is a real Remote OK job URL that we previously
   * inspected and confirmed contains a Schema.org JobPosting.
   */
  console.log("\n=== TEST 3: getByUrl() ===");

  const testJobUrl =
    "https://remoteok.com/remote-jobs/remote-frontend-engineer-bjak-1137410";

  const retrievedJob = await provider.getByUrl(testJobUrl);

  /**
   * Print the normalized opportunity returned by the provider.
   *
   * We want to verify that the provider converts the Remote OK
   * page into Route's common Opportunity structure rather than
   * returning raw HTML or a provider-specific object.
   */
  console.log("Retrieved job:", JSON.stringify(retrievedJob, null, 2));

  if (!retrievedJob) {
    throw new Error("Expected Remote OK getByUrl() to return an opportunity.");
  }

  /**
   * -------------------------------------------------------------
   * TEST 4: getPreparationContext()
   * -------------------------------------------------------------
   *
   * This follows the actual Route preparation flow:
   *
   * getByUrl()
   *     ↓
   * Opportunity
   *     ↓
   * getPreparationContext()
   */
  console.log("\n=== TEST 4: getPreparationContext() ===");

  const preparationContext = await provider.getPreparationContext(retrievedJob);

  console.log(
    "Preparation context:",
    JSON.stringify(preparationContext, null, 2),
  );

  /**
   * Validate the complete result against the runtime
   * preparation contract.
   */
  const validation =
    opportunityPreparationContextSchema.safeParse(preparationContext);

  if (!validation.success) {
    console.error(
      "Preparation context validation failed:",
      validation.error.format(),
    );

    throw new Error("Remote OK preparation context failed schema validation.");
  }

  console.log("✓ Remote OK preparation context passed schema validation.");

  /**
   * -------------------------------------------------------------
   * TEST 5: Basic behavioral checks
   * -------------------------------------------------------------
   */

  /**
   * The same opportunity must be preserved.
   */
  if (preparationContext.opportunity.id !== retrievedJob.id) {
    throw new Error("Preparation context contains a different opportunity.");
  }

  console.log("✓ Opportunity identity preserved.");

  /**
   * Provider provenance must identify Remote OK.
   */
  if (preparationContext.source.provider !== "remoteok") {
    throw new Error("Preparation context has an unexpected provider.");
  }

  console.log("✓ Provider provenance preserved.");

  /**
   * The preparation context must include retrieval time.
   */
  if (!preparationContext.source.retrievedAt) {
    throw new Error("Preparation context is missing retrievedAt.");
  }

  console.log("✓ Retrieval timestamp present.");

  /**
   * The existing Remote OK description should be preserved
   * as source content.
   */
  if (retrievedJob.description) {
    const sourceContent = preparationContext.sourceContent;

    if (!sourceContent || sourceContent.length === 0) {
      throw new Error("Expected sourceContent to contain the job description.");
    }

    if (sourceContent[0]?.content !== retrievedJob.description) {
      throw new Error(
        "Preparation source content does not preserve the job description.",
      );
    }

    console.log("✓ Job description preserved in sourceContent.");
  }

  /**
   * If Remote OK exposed an employment type through metadata,
   * verify that our preparation context preserved it.
   */
  const employmentType = retrievedJob.metadata?.employmentType;

  if (typeof employmentType === "string") {
    const requirements = preparationContext.preparation.requirements;

    if (!requirements || requirements.length === 0) {
      throw new Error(
        "Expected employment type to appear in preparation requirements.",
      );
    }

    const employmentRequirement = requirements.find(
      (requirement) => requirement.title === "Employment type",
    );

    if (!employmentRequirement) {
      throw new Error("Employment type requirement was not preserved.");
    }

    if (employmentRequirement.description !== employmentType) {
      throw new Error("Employment type value was not preserved correctly.");
    }

    console.log("✓ Employment type preserved.");
  } else {
    console.log("No employment type available to validate.");
  }

  console.log("\n✓ REMOTE OK PROVIDER TEST PASSED.");
}

main().catch((error) => {
  /**
   * Surface unexpected failures clearly during
   * manual development/testing.
   */
  console.error("Remote OK provider test failed:", error);

  process.exit(1);
});
