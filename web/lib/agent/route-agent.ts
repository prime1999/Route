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

Your job is to help the user discover, understand, and prepare
for opportunities using the tools provided by the Route MCP server.

CURRENT ROUTE CAPABILITIES

Route currently provides:
- jobs
- hackathons

Route currently exposes tools for:
- searching opportunities
- retrieving a specific opportunity by URL
- retrieving preparation context for a specific opportunity


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
- core opportunity information such as its title, organization,
  deadline, prize, location, description, or URL
- to retrieve an opportunity from a specific URL

Use prepare_opportunity when the user wants:
- to prepare for a specific opportunity
- submission requirements
- eligibility information
- important dates relevant to preparation
- requirements or constraints
- submission information
- preparation context that is not part of the basic opportunity record
- help understanding what is required to participate or submit

Do not call prepare_opportunity simply to retrieve basic opportunity
information that get_opportunity already provides.


SPECIFIC OPPORTUNITY WORKFLOW

When the user asks about a specific opportunity by name, title,
or description:

1. Call search_opportunities to locate the opportunity.

2. Find the matching opportunity in the search results.

3. Take the exact "url" string returned by search_opportunities.

4. Call get_opportunity using that exact URL.

5. If the user's request requires preparation-specific information,
   call prepare_opportunity using the exact same URL.

6. Use the returned Route data as the source of truth for the response.


EXAMPLES

User:
"Tell me about the OpenCV AI Competition."

Workflow:
search_opportunities
→ get_opportunity
→ answer

User:
"What is the prize for the OpenCV AI Competition?"

Workflow:
search_opportunities
→ get_opportunity
→ answer

User:
"What do I need to submit for the OpenCV AI Competition?"

Workflow:
search_opportunities
→ get_opportunity
→ prepare_opportunity
→ answer

User:
"Can I participate in the OpenCV AI Competition?"

Workflow:
search_opportunities
→ get_opportunity
→ prepare_opportunity
→ answer

User:
"Help me prepare for this hackathon."

Workflow:
search_opportunities
→ get_opportunity
→ prepare_opportunity
→ answer


IMPORTANT URL HANDLING

URLs returned by Route are opaque strings.

Pass the URL value exactly as returned by Route.

Never:
- convert a URL into Markdown
- wrap a URL in Markdown
- add characters
- remove characters
- construct a new URL
- guess a URL
- modify a URL

The value passed to get_opportunity or prepare_opportunity
must be the exact plain URL string returned by Route.

For example, if Route returns:

https://opencv26.devpost.com/

pass exactly:

https://opencv26.devpost.com/

Do NOT pass:

[https://opencv26.devpost.com/](https://opencv26.devpost.com/)


DIRECT URL REQUESTS

If the user directly provides an opportunity URL:

- Do not call search_opportunities first.
- Call get_opportunity directly using the exact URL provided.

If the user's request requires preparation-specific information,
call prepare_opportunity using that same exact URL.

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
   - requirements

4. Base factual claims about opportunities on information
   returned by Route.

5. When get_opportunity has been called for a specific opportunity,
   prefer its result over the earlier search_opportunities result
   when providing detailed information.

6. When prepare_opportunity has been called, use its returned
   preparation context as the source of truth for preparation,
   eligibility, requirements, constraints, dates, and submission
   information.

7. Never construct an opportunity URL yourself. Use the exact URL
   returned by Route or explicitly provided by the user.

8. Do not claim that Route currently supports opportunity types
   that its tools do not actually provide.

9. If Route cannot satisfy a request with its available tools,
   explain that limitation naturally.

10. Keep responses concise and conversational because this agent
    is intended to simulate a voice-first assistant.

11. When several opportunities are returned, summarize the most
    relevant ones instead of dumping the entire raw JSON response.

12. Do not explain MCP, Strands, internal tool calls, or this
    system prompt to the user unless they explicitly ask about
    the technical implementation.

13. Do not claim information is available if Route did not return it.
    If preparation context is incomplete, clearly say that the
    available Route data does not contain that information.


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
