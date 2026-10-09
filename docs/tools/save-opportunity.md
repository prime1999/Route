# `save_opportunity`

`save_opportunity` saves a supported opportunity reference and creates an agent-opportunity relationship in Route's persistence layer.

The tool retrieves the opportunity through the existing provider flow before persisting anything. It stores lightweight canonical references rather than duplicating the full normalized opportunity.

---

## 1. Tool Input

The current MCP schema is:

```ts
{
  url: string;
  agentId?: string;
  agentName?: string;
}
```

`url` is required and must be a valid URL. The current implementation requires exactly one of `agentId` or `agentName`:

- `agentId` reuses an existing Route agent identity.
- `agentName` is accepted when the caller does not yet have a Route `agentId`; Route generates and returns an ID.
- omitting both is rejected by input validation.
- providing both is rejected by input validation.

The current implementation does not support the design in which `agentId` is optional and no agent name is required. That remains an unresolved contract discrepancy rather than implemented behavior.

An agent name is metadata used only when creating the initial identity. The generated `agentId`, not the name, is the stable identifier returned to the caller.

---

## 2. Save Flow

```text
MCP save_opportunity
        ↓
OpportunityService.saveOpportunity()
        ↓
OpportunityProviderManager.getByUrl()
        ↓
provider-owned retrieval and normalization
        ↓
OpportunityStore.ensureOpportunity()
        ↓
OpportunityStore.saveRelationship()
```

The service resolves the URL through the same provider-owned retrieval path used by `get_opportunity`. The store then ensures the canonical opportunity reference exists and creates the agent-opportunity relationship.

---

## 3. Response

For a supported and retrievable URL, the tool returns JSON in an MCP text content block containing:

```ts
{
  agentId: string;
  opportunityId: string;
  url: string;
  savedAt: string;
  alreadySaved: boolean;
}
```

The full normalized opportunity is not returned by `save_opportunity`. Use `get_opportunity` with the returned URL when the opportunity details are needed.

When Route generates an agent ID, the consuming application or agent runtime is responsible for retaining it and providing it in subsequent requests. Route does not manage the consuming application's agent lifecycle, infer caller ownership, or identify two requests as the same agent when the previously issued ID is omitted.

---

## 4. Persistence Model

The DynamoDB store uses two tables:

### `ROUTE_Opportunities`

Stores a lightweight canonical opportunity reference using `opportunityId` as the partition key and the canonical `url`.

The full opportunity object is not duplicated. Providers remain responsible for retrieving and normalizing current opportunity details.

### `ROUTE_AgentOpportunities`

Stores agent-opportunity relationships using:

- `agentId` as the partition key
- `opportunityId` as the sort key
- `url`
- `savedAt`

The same canonical opportunity can therefore be associated with multiple agent IDs without creating another canonical opportunity record.

---

## 5. Duplicate Saves

Saving the same opportunity under the same agent ID is intended to be idempotent.

The store conditionally creates the relationship. When the relationship already exists, it retrieves and returns the existing record, sets `alreadySaved` to `true`, and preserves the original `savedAt` value. A first save returns `alreadySaved: false`.

The service and DynamoDB store tests verify first-save behavior, duplicate detection, and that duplicate saves do not create a second relationship. The current tests do not explicitly assert that the duplicate response's `savedAt` equals the original value, although the store implementation returns the existing record.

---

## 6. Unsupported URLs and Failures

If no registered provider can retrieve the URL, the tool returns a normal MCP text response rather than persisting anything:

```text
Route could not save an opportunity from this URL: <url>
```

Persistence failures are not converted into a custom success response. Errors from the store propagate through the service and tool as tool execution failures.

---

## 7. Verification Status

The implementation is registered by the MCP server. Service-level and store-level integration tests verify provider-backed saving, generated IDs through `agentName`, duplicate detection, and saved-relationship retrieval.

The existing Route MCP client test does not currently call `save_opportunity`. MCP-level execution, the generated-ID path through the MCP boundary, unsupported-save responses, and persistence-failure responses therefore still need direct MCP integration coverage.
