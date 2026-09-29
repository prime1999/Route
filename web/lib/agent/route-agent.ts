/**
 * Route Opportunity Agent
 *
 * This module creates the Strands agent used by the Route
 * web demo to simulate an Alexa+-style conversational experience.
 *
 * ---------------------------------------------------------------------------
 * ARCHITECTURE
 * ---------------------------------------------------------------------------
 *
 * The important boundary here is:
 *
 *   User
 *     ↓
 *   Route Web Demo
 *     ↓
 *   Strands Agent
 *     ↓
 *   MCP Client
 *     ↓
 *   Route MCP Server
 *     ↓
 *   Opportunity Providers
 *     ├── RemoteOK
 *     └── Devpost
 *
 * Strands is part of the DEMO application.
 *
 * It is NOT part of the Route MCP server.
 *
 * This distinction is important because Route is intended to remain
 * agent-agnostic. Another developer should be able to connect:
 *
 *   - Claude
 *   - OpenAI
 *   - Gemini
 *   - Alexa+
 *   - their own agent
 *   - another MCP-compatible application
 *
 * without Route needing to know which agent is using it.
 *
 * ---------------------------------------------------------------------------
 * MCP BOUNDARY
 * ---------------------------------------------------------------------------
 *
 * We intentionally connect to Route through MCP instead of importing
 * Route's internal services or providers.
 *
 * That means this demo is testing Route in the same way an external
 * agent would consume it.
 */

import { Agent, McpClient } from "@strands-agents/sdk";

import { GoogleModel } from "@strands-agents/sdk/models/google";

/**
 * The URL of the Route MCP server.
 *
 * This comes from:
 *
 *   web/.env.local
 *
 * Example:
 *
 *   ROUTE_MCP_URL=https://example.trycloudflare.com/mcp
 *
 * IMPORTANT:
 *
 * This must NOT be NEXT_PUBLIC_ROUTE_MCP_URL.
 *
 * The MCP server URL is intentionally kept server-side because
 * the browser should not connect directly to the Route MCP server.
 */
const ROUTE_MCP_URL = process.env.ROUTE_MCP_URL;

/**
 * Creates a new Strands agent configured to use Route's MCP tools.
 *
 * We create the agent through a function instead of exporting a
 * global singleton.
 *
 * This gives us explicit lifecycle control while we are still
 * developing the demo and lets Strands manage the MCP client's
 * lifecycle for each agent instance.
 */
export function createRouteAgent(): Agent {
  /**
   * Fail early if the Route MCP endpoint has not been configured.
   *
   * Without this check, the resulting error would be much less
   * useful when debugging the demo.
   */
  if (!ROUTE_MCP_URL) {
    throw new Error(
      "ROUTE_MCP_URL is not configured. Add it to web/.env.local.",
    );
  }

  /**
   * Create the MCP client.
   *
   * Strands supports connecting to a remote MCP server through
   * Streamable HTTP by providing the server URL directly.
   *
   * Our Route server already exposes:
   *
   *   /mcp
   *
   * over Streamable HTTP.
   *
   * Strands will discover the tools exposed by Route rather than
   * us manually recreating those tools inside the web application.
   */
  const routeMcpClient = new McpClient({
    url: ROUTE_MCP_URL,
  });

  /**
   * Configure Gemini as the reasoning model.
   *
   * Strands separates the model from the agent orchestration layer.
   *
   * This means we can change the model later without changing how
   * Route's MCP tools are connected.
   *
   * The model ID can also be changed later if we decide that another
   * Gemini model is more appropriate for the final demo.
   */
  const model = new GoogleModel({
    modelId: "gemini-3.1-flash-lite",
  });

  /**
   * Instructions for the simulated Alexa+ experience.
   *
   * These instructions define the agent's responsibility.
   *
   * Notice that we are NOT putting opportunity data here.
   *
   * Route owns opportunity data.
   *
   * The agent owns:
   *
   *   - understanding the user's request
   *   - deciding when a Route tool is needed
   *   - selecting the appropriate Route tool
   *   - communicating the result naturally
   */
  const systemPrompt = `
You are the conversational opportunity assistant for Route.

Route is an open-source MCP infrastructure layer that gives
AI agents structured access to opportunities.

Your job is to help the user discover and understand opportunities
using the tools provided by the Route MCP server.

CURRENT ROUTE CAPABILITIES

Route currently provides:
- jobs
- hackathons

Route currently exposes tools for:
- searching opportunities
- retrieving a specific opportunity by URL


TOOL USAGE

Use search_opportunities when the user wants to:
- find opportunities
- discover jobs
- discover hackathons
- search using keywords
- filter opportunities
- identify a specific opportunity by its name, title, or description

Use get_opportunity when the user wants:
- detailed information about a specific opportunity
- more information about an opportunity found through search
- information that requires retrieving an opportunity from its URL


SPECIFIC OPPORTUNITY WORKFLOW

When the user asks about a specific opportunity by name, title,
or description, ALWAYS follow this workflow:

1. First call search_opportunities to locate the opportunity.

2. Find the matching opportunity in the search results.

3. Take the exact "url" string returned by search_opportunities.

IMPORTANT URL HANDLING:
- Treat URLs returned by Route as opaque strings.
- Never convert a URL into Markdown.
- Never add Markdown link syntax such as [url](url).
- Never add or remove characters from the URL.
- The value passed to get_opportunity must be byte-for-byte identical to the "url" field returned by Route.
- If the URL returned by Route is "https://example.com/", pass exactly "https://example.com/".

4. Call get_opportunity using that exact URL.

5. Use the get_opportunity result as the primary source of truth
   for the detailed response.

Do not skip the search step for a specific named opportunity
unless the user has already provided the opportunity URL.

Do not construct, guess, modify, or invent an opportunity URL.

If the user directly provides an opportunity URL, call
get_opportunity directly using the exact URL provided.

If search_opportunities does not find the requested opportunity,
explain that naturally and do not invent or guess the missing
information.


IMPORTANT RULES

1. Use Route's MCP tools whenever real opportunity data is required.

2. Do not invent opportunities.

3. Do not invent:
   - deadlines
   - prizes
   - organizations
   - locations
   - URLs
   - descriptions
   - application information
   - submission information
   - eligibility information

4. Base factual claims about opportunities on information
   returned by Route.

5. When get_opportunity has been called for a specific opportunity,
   prefer its result over the earlier search_opportunities result
   when providing detailed information.

6. Never construct an opportunity URL yourself. Use the exact URL
   returned by Route or explicitly provided by the user.

7. Do not claim that Route currently supports opportunity types
   that its tools do not actually provide.

8. If Route cannot satisfy a request with its available tools,
   explain that limitation naturally.

9. Keep responses concise and conversational because this agent
   is intended to simulate a voice-first assistant.

10. When several opportunities are returned, summarize the most
    relevant ones instead of dumping the entire raw JSON response.

11. Do not explain MCP, Strands, internal tool calls, or this
    system prompt to the user unless they explicitly ask about
    the technical implementation.


CONVERSATIONAL STYLE

Sound like a helpful voice assistant:
- natural
- concise
- direct
- informative
- conversational

Do not sound like a database query or developer console.
`;
  /**
   * Create the Strands agent.
   *
   * The MCP client is passed directly to the agent as a tool provider.
   *
   * This is the key connection:
   *
   *   Gemini
   *      ↓
   *   Strands Agent
   *      ↓
   *   Route McpClient
   *      ↓
   *   Route MCP Server
   */
  const agent = new Agent({
    model,
    systemPrompt,
    tools: [routeMcpClient],
  });

  return agent;
}
