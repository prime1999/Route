import { RemoteOkProvider } from "./remoteOk.js";

/**
 * Manual test for the Remote OK provider.
 *
 * This test calls the real Remote OK API and verifies that:
 *
 * 1. Jobs can be retrieved.
 * 2. Keyword filtering works.
 * 3. The provider returns the new OpportunityProviderResult
 *    structure.
 */
async function main() {
  const provider = new RemoteOkProvider();

  console.log("=== TEST 1: Default search ===");

  const defaultResult = await provider.search({
    limit: 10,
  });

  console.log(`Found ${defaultResult.opportunities.length} jobs`);

  for (const opportunity of defaultResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.organization}`);
  }

  console.log("\nNext cursor:", defaultResult.nextCursor ?? "none");

  console.log("\n=== TEST 2: TypeScript jobs ===");

  const typescriptResult = await provider.search({
    keyword: "typescript",
    limit: 10,
  });

  console.log(`Found ${typescriptResult.opportunities.length} TypeScript jobs`);

  for (const opportunity of typescriptResult.opportunities) {
    console.log(`- ${opportunity.title} | ${opportunity.organization}`);
  }

  console.log("\nNext cursor:", typescriptResult.nextCursor ?? "none");

  console.log("\n=== TEST 3: Remote filter ===");

  const remoteResult = await provider.search({
    keyword: "developer",
    remote: true,
    limit: 10,
  });

  console.log(`Found ${remoteResult.opportunities.length} remote jobs`);

  for (const opportunity of remoteResult.opportunities) {
    console.log(
      `- ${opportunity.title} | ${opportunity.organization} | remote=${opportunity.remote}`,
    );
  }

  console.log("\nNext cursor:", remoteResult.nextCursor ?? "none");
}

main().catch((error) => {
  console.error("Remote OK provider test failed:", error);

  process.exit(1);
});
