import { OpportunityProviderManager } from "./manager.js";

/**
 * Manual test for the Opportunity Provider Manager.
 *
 * The manager sits above the individual providers and decides
 * which providers should receive each search.
 */
async function main() {
  const manager = new OpportunityProviderManager();

  console.log("=== TEST 1: Hackathons ===");

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

  for (const provider of manager.getProviders()) {
    console.log(`- ${provider.name}: ${provider.supportedTypes.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Provider manager test failed:", error);

  process.exit(1);
});
