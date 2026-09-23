# `health_check`

`health_check` is a development diagnostic tool exposed by the Route MCP server.

Its purpose is to verify that the MCP server is running and able to respond to tool calls.

---

## 1. Purpose

The health check provides a simple way to distinguish between problems with the MCP server itself and problems deeper in the Route system.

For example:

```text id="0f3p5k"
MCP Client
    │
    ▼
health_check
    │
    ▼
Route MCP Server
```

If this succeeds but a provider-backed tool fails, the investigation can move further down the application stack.

---

# 2. Tool Name

```text id="r8m2z4"
health_check
```

---

# 3. Input

The tool accepts an empty object.

```json id="2n7w4c"
{}
```

The input is validated using Zod:

```ts id="0n2w8j"
z.object({});
```

Even though the tool currently requires no input, keeping an explicit schema gives the tool a consistent validation boundary with the other Route tools.

---

# 4. Response

When the Route MCP server is running and able to process the request, the tool returns a text response indicating that the server is running.

The current message is:

```text id="x4y8m1"
Route MCP server is running.
```

The exact MCP response envelope is handled by the MCP SDK.

---

# 5. What It Verifies

The health check verifies that the Route MCP server can:

1. Receive an MCP request.
2. Resolve the registered tool.
3. Execute the tool handler.
4. Return an MCP response.

It does **not** verify:

- Remote OK availability
- Devpost availability
- provider functionality
- search correctness
- database connectivity
- DynamoDB connectivity
- Bedrock connectivity
- Alexa+ connectivity

Those belong to other layers and will require their own tests.

---

# 6. Why Keep It?

Although `health_check` is not a core Route product capability, it is useful during development.

It provides a minimal diagnostic path:

```text id="8z3v5n"
Can the MCP server respond?
        │
        ▼
    health_check
        │
   ┌────┴────┐
   │         │
  YES        NO
   │         │
   ▼         ▼
Investigate   MCP
application   connection/
or provider   server setup
```

This is particularly useful while Route's MCP infrastructure is still being developed.

---

# 7. Scope

`health_check` is currently considered a development diagnostic tool.

It should not be treated as a major Route opportunity capability.

As the production deployment architecture becomes clearer, we can decide whether:

- to keep it,
- replace it with a more conventional health endpoint,
- or maintain it alongside a production health mechanism.

No decision has been made to remove it yet.

---

# 8. Related Documentation

- [MCP](../mcp.md)
- [Architecture](../architecture.md)
- [Search Opportunities](./search-opportunities.md)

---

## Summary

`health_check` provides the simplest possible MCP tool for confirming that Route is alive and able to respond to tool calls.

Its purpose is diagnostic rather than product-facing.
