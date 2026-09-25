import { DevpostProvider } from "./devpost.js";

/**
 * Manual Devpost provider test.
 *
 * Verifies:
 * 1. search()
 * 2. pagination
 * 3. keyword filtering
 * 4. getByUrl()
 * 5. invalid URL handling
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
  }

  console.log("\n=== TEST 5: Invalid URL ===");

  const invalidUrlResult = await provider.getByUrl("https://google.com");

  console.log("Result:", invalidUrlResult);

  console.log("\n=== TEST 6: Non-existent Devpost URL ===");

  const missingHackathonResult = await provider.getByUrl(
    "https://devpost.com/software/route-does-not-exist-999999999",
  );

  console.log("Result:", missingHackathonResult);
}

main().catch((error) => {
  console.error("Devpost provider test failed:", error);
  process.exit(1);
});
