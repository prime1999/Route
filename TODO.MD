# Route TODO

This file tracks planned work, deferred decisions,
and improvements for Route.

## Current Focus

- [ ] Implement `get_opportunity`
  - [x] Extend provider interface with `getByUrl()`
  - [x] Remote OK URL retrieval
  - [x] Devpost URL retrieval
  - [ ] Provider URL resolution
  - [ ] application/service layer
  - [ ] MCP tool
  - [ ] register tool
  - [ ] MCP integration tests
  - [x] Test both providers independently

## MCP

- [ ] Build Provider Manager URL resolution
- [ ] Build opportunity application/service layer
- [ ] Build `get_opportunity` MCP tool
- [ ] Register `get_opportunity`
- [ ] Live-test `get_opportunity`
- [ ] Observe real success responses
- [ ] Observe real validation errors
- [ ] Observe provider/network errors
- [ ] Decide public response/error contract
- [ ] Document finalized MCP responses and errors

## Opportunity Infrastructure

- [ ] `save_opportunity`
- [ ] persistence model
- [ ] DynamoDB
- [ ] `list_saved_opportunities`
- [ ] `prepare_opportunity`
- [ ] test complete lifecycle

## Providers

- [x] Provider interface `getByUrl()`
- [x] Direct Remote OK retrieval
- [x] Direct Devpost retrieval
- [x] Remote OK URL validation
- [x] Devpost URL validation
- [x] Devpost subdomain handling
- [x] Provider-specific remote semantics
- [ ] Provider URL ownership resolution in Provider Manager
- [ ] Provider requirements
- [ ] How to add a provider
- [ ] More providers after MVP is stable

## Agent Integration

- [ ] Strands
- [ ] Bedrock
- [ ] Agent-driven discovery
- [ ] Understanding
- [ ] Preparation

## Alexa+

- [ ] Complete MCP testing
- [ ] HTTPS
- [ ] Review Alexa+ requirements
- [ ] Auth
- [ ] Connect Alexa+
- [ ] Tool discovery/search tests
- [ ] Simulated/demo experience
- [ ] Final demo
- [ ] Verify hackathon requirements

## Documentation

- [x] `docs/README.md`
- [x] `docs/architecture.md`
- [x] `docs/mcp.md`
- [x] `docs/opportunities.md`
- [x] Provider documentation
- [x] Health check docs
- [x] Search opportunities docs
- [x] Document provider-level `getByUrl()`
- [x] Document Devpost subdomain handling
- [x] Document provider-specific remote semantics
- [x] Document URL-based opportunity retrieval
- [ ] `get-opportunity.md`
- [ ] Save docs
- [ ] Prepare docs
- [ ] Architecture decision records
- [ ] Response/error contracts
- [ ] Root README review

## Codebase Cleanup

- [ ] Unused dependencies
- [ ] Debug logs
- [ ] Duplicate domain types/schema
- [ ] Provider error handling
- [ ] Test organization
- [ ] Naming consistency
- [ ] Full build/test
- [ ] Repository structure docs

## Future Opportunity Types

- [ ] Scholarships
- [ ] Fellowships
- [ ] Grants
- [ ] Internships
- [ ] Accelerators
- [ ] Events
- [ ] Freelance

## Future Capabilities

- [ ] Recommendations/personalization
- [ ] Application assistance
- [ ] CV/resume preparation
- [ ] Outreach/cold-DM
- [ ] Tracking
- [ ] Notifications
- [ ] Browser automation
- [ ] More MCP clients
