/**
 * Route Agent Diagnostic Test
 *
 * This endpoint is an observability checkpoint for the Route
 * Strands agent.
 *
 * The purpose is to determine exactly:
 *
 *   1. Which Route MCP tools the agent calls.
 *   2. The order in which those tools are called.
 *   3. The arguments passed to each tool.
 *   4. The result returned by each tool.
 *   5. The final response produced by the agent.
 *
 * We use `agent.stream()` because `agent.invoke()` only gives
 * us the final AgentResult and hides the intermediate tool calls.
 *
 * IMPORTANT:
 *
 * We intentionally do not capture model chain-of-thought.
 * We only record observable tool execution and final output.
 */

import { NextResponse } from "next/server";

import { createRouteAgent } from "@/lib/agent/route-agent";

export async function GET() {
  try {
    const agent = createRouteAgent();

    /**
     * Keep this request identical to our previous test.
     *
     * This lets us compare the agent's previous final response
     * with the actual tool execution that produced it.
     */
    const userRequest =
      "Tell me about the OpenCV AI Competition 2026, including its themes, prize pool, deadline, and how to submit.";

    /**
     * Observable execution trace.
     *
     * We only store information relevant to understanding
     * the agent -> MCP -> Route execution path.
     */
    const events: Array<Record<string, unknown>> = [];

    /**
     * `agent.stream()` returns an AsyncGenerator.
     *
     * The generator:
     *
     *   - yields intermediate events
     *   - eventually returns the final AgentResult
     *
     * Because `for await...of` consumes yielded values but does
     * not expose the generator's final return value, we manually
     * consume it with `.next()`.
     */
    const stream = agent.stream(userRequest);

    let finalResult: unknown;

    while (true) {
      /**
       * Ask the generator for the next event.
       *
       * `done === false`
       *   means we received another stream event.
       *
       * `done === true`
       *   means the agent has finished and `value` is now
       *   the final AgentResult.
       */
      const iteration = await stream.next();

      if (iteration.done) {
        /**
         * This is the AgentResult returned by `agent.stream()`.
         */
        finalResult = iteration.value;
        break;
      }

      const event = iteration.value;

      /**
       * BEFORE TOOL CALL
       *
       * This tells us exactly which tool the agent selected
       * and what arguments it generated.
       */
      if (event.type === "beforeToolCallEvent") {
        events.push({
          type: "tool_call",
          tool: event.toolUse.name,
          arguments: event.toolUse.input,
        });

        continue;
      }

      /**
       * AFTER TOOL CALL
       *
       * This tells us what the tool returned after execution.
       */
      if (event.type === "afterToolCallEvent") {
        console.log(
          "\n===== RAW TOOL RESULT =====\n",
          JSON.stringify(event.result, null, 2),
        );

        events.push({
          type: "tool_result",
          tool: event.toolUse.name,
          result: event.result,
          error: event.error ? event.error.message : undefined,
        });

        continue;
      }

      /**
       * AFTER MODEL CALL
       *
       * This tells us when a model generation completed and
       * the reason the model stopped.
       */
      if (event.type === "afterModelCallEvent") {
        events.push({
          type: "model_call_complete",
          stopReason: event.stopData?.stopReason,
          attemptCount: event.attemptCount,
        });

        continue;
      }
    }

    /**
     * We now have the actual AgentResult.
     *
     * For this diagnostic endpoint we return the complete
     * result as JSON so we can inspect its exact structure.
     *
     * This is temporary diagnostic output. We can make the
     * production response much smaller later.
     */
    return NextResponse.json({
      success: true,
      request: userRequest,
      events,
      finalResult,
    });
  } catch (error) {
    console.error("Route agent diagnostic test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown Route agent error.",
      },
      {
        status: 500,
      },
    );
  }
}
