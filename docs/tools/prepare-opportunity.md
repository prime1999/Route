# `prepare_opportunity`

`prepare_opportunity` retrieves structured, source-backed preparation context for one supported opportunity URL.

The tool is complete for the current MVP. It does not use an LLM or perform personalized reasoning, recommendations, application generation, or automatic submission.

---

## 1. Tool Input

The tool accepts one URL:

```ts
{
  url: string;
}
```

The MCP boundary validates that `url` is a valid URL before the request reaches the Preparation Service.

---

## 2. Preparation Flow

```text
MCP prepare_opportunity
        ↓
PreparationService
        ↓
OpportunityProviderManager
        ↓
provider.getByUrl()
        ↓
provider.getPreparationContext()
        ↓
OpportunityPreparationContext
```

The Provider Manager resolves the provider that owns the URL. The selected provider retrieves the normalized opportunity and builds the preparation context.

Current provider support includes:

- Remote OK
- Devpost

---

## 3. Output

For a supported and retrievable URL, the tool returns an `OpportunityPreparationContext` as JSON in an MCP text content block.

The context includes:

- the normalized `opportunity`
- `preparation` data such as important dates, eligibility, requirements, constraints, categories, and submission information when available
- optional preserved `sourceContent`
- `source` provenance containing the provider, source URL, and retrieval timestamp

Route preserves source content instead of replacing it with an LLM-generated summary. The connected AI agent is responsible for reasoning over this context and producing user-specific guidance.

---

## 4. Unsupported URLs

If no registered provider recognizes or retrieves the URL, the request returns a normal MCP text response rather than an MCP execution error:

```text
Route could not prepare an opportunity from this URL: <url>
```

Route does not attempt to prepare arbitrary URLs that are not owned by a registered provider.

---

## 5. MVP Boundary

`prepare_opportunity` is complete for the current MVP. It is not a general-purpose tool for retrieving every possible section or linked resource from an opportunity.

A future `get_opportunity_sub_links` tool is deferred, not implemented. It will be revisited after the next two specialized opportunity tools are implemented and tested. Real client and agent usage will then determine which additional resources are needed before the tool contract is finalized. No schema is defined yet.

---

## 6. Verification

The MCP client integration test verifies:

- `prepare_opportunity` is registered
- Devpost `get_opportunity` works
- Devpost `prepare_opportunity` works
- preparation data is returned
- source content is preserved
- source provenance is returned
- unsupported URLs are handled correctly
