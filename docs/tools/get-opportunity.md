# `get_opportunity`

`get_opportunity` retrieves one supported opportunity from its canonical URL.

The tool is exposed through MCP and delegates retrieval through Route's application and provider layers. It does not contain provider-specific URL or parsing logic.

---

## 1. Tool Input

The tool accepts one URL:

```ts
{
  url: string;
}
```

The MCP boundary validates that `url` is a valid URL before the request reaches the application service.

---

## 2. Retrieval Flow

```text
MCP get_opportunity
        ↓
OpportunityService
        ↓
OpportunityProviderManager
        ↓
provider.canHandleUrl()
        ↓
matching provider.getByUrl()
        ↓
normalized Opportunity
```

The Provider Manager asks registered providers which one owns the URL. The selected provider retrieves and normalizes the source data into Route's shared `Opportunity` model.

Current supported direct retrieval includes:

- Remote OK opportunity URLs
- Devpost URLs, including Devpost-owned subdomains such as `revenuecat-shipaton-2026.devpost.com`

---

## 3. Output

For a supported and retrievable URL, the tool returns the normalized `Opportunity` as JSON in an MCP text content block.

The normalized response includes Route fields such as:

- `id`
- `title`
- `type`
- `organization`
- `url`
- `source`

The complete response uses the shared `Opportunity` model rather than a provider-specific response shape.

---

## 4. Unsupported URLs

If no registered provider claims the URL, the request returns a normal MCP text response rather than an MCP execution error:

```text
Route could not retrieve an opportunity from this URL: <url>
```

Route does not attempt to retrieve arbitrary URLs that are not owned by a registered provider.

---

## 5. Verification

The Route MCP integration test verifies:

- `health_check`, `search_opportunities`, and `get_opportunity` through the MCP client
- Remote OK retrieval
- Devpost subdomain retrieval
- normalized provider source values
- controlled handling of an unsupported URL
