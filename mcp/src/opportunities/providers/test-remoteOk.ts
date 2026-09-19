/**
 * Remote OK Provider Test
 *
 * This file performs a direct integration test of the Remote OK provider.
 *
 * The purpose is intentionally narrow:
 *
 * 1. Instantiate the RemoteOkProvider.
 * 2. Ask it for job opportunities.
 * 3. Verify that the provider can fetch the live Remote OK API.
 * 4. Verify that the provider normalizes the external data into Route's
 *    common Opportunity structure.
 *
 * We are NOT calling the MCP server here.
 *
 * Keeping this test separate allows us to prove that the provider works
 * independently before introducing another layer of complexity.
 */

import { RemoteOkProvider } from "./remoteOk.js";

/**
 * Create the provider instance.
 *
 * The provider contains all Remote OK-specific logic, so the test itself
 * should not need to know anything about Remote OK's API response format.
 */
const provider = new RemoteOkProvider();

try {
  /**
   * Search for jobs through the provider.
   *
   * Passing type: "job" makes our intent explicit and also verifies that
   * the provider correctly handles Route's generic search parameters.
   */
  const opportunities = await provider.search({
    type: "job",
  });

  /**
   * Print the number of opportunities returned.
   *
   * A successful non-zero result tells us that the external request,
   * parsing, normalization, and return path are working together.
   */
  console.log(`Found ${opportunities.length} normalized opportunities.`);

  /**
   * Print only the first three opportunities.
   *
   * We don't want to flood the terminal with the entire Remote OK feed.
   * Three records are enough to inspect whether our normalized structure
   * looks correct.
   */
  console.log(JSON.stringify(opportunities.slice(0, 3), null, 2));
} catch (error) {
  /**
   * Surface the error clearly during development.
   *
   * We rethrow the error after logging it so that the process exits with
   * a failure status. That makes the test useful later in automated CI.
   */
  console.error("Remote OK provider test failed:", error);

  process.exitCode = 1;
}
