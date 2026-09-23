# Route TODO

This file tracks planned work, deferred decisions, investigations,
and improvements for Route.

Items should be removed or moved to the appropriate documentation
once they are completed and verified.

---

## Current Focus

- [ ] Implement `get_opportunity`
  - [ ] Extend provider interface with `getByUrl()`
  - [ ] Implement Remote OK URL retrieval
  - [ ] Implement Devpost URL retrieval
  - [ ] Add provider URL resolution
  - [ ] Add application/service layer for retrieval
  - [ ] Add MCP tool
  - [ ] Register the tool
  - [ ] Add MCP integration tests
  - [ ] Test both providers with real opportunities

---

## MCP

- [ ] Live-test `get_opportunity`
- [ ] Observe real success responses
- [ ] Observe real validation errors
- [ ] Observe provider/network errors
- [ ] Decide the public response/error contract
- [ ] Document finalized MCP responses and errors

---

## Opportunity Infrastructure

- [ ] Implement `save_opportunity`
- [ ] Decide saved-opportunity persistence model
- [ ] Add DynamoDB persistence
- [ ] Implement `list_saved_opportunities`
- [ ] Implement `prepare_opportunity`
- [ ] Test the complete opportunity lifecycle

---

## Providers

- [ ] Test direct Remote OK opportunity retrieval
- [ ] Test direct Devpost opportunity retrieval
- [ ] Define provider URL ownership rules
- [ ] Document provider requirements
- [ ] Document how to add a new provider
- [ ] Add additional providers when MVP is stable

---

## Agent Integration

- [ ] Integrate AWS Strands Agents SDK
- [ ] Connect Strands to Route through MCP
- [ ] Integrate Amazon Bedrock
- [ ] Test agent-driven opportunity discovery
- [ ] Test agent-driven opportunity understanding
- [ ] Test agent-driven preparation flow

---

## Alexa+

- [ ] Complete MCP server testing independently
- [ ] Make Route remotely accessible over HTTPS
- [ ] Review Alexa+ MCP integration requirements
- [ ] Implement required authentication
- [ ] Connect Route to Alexa+
- [ ] Test Alexa+ tool discovery
- [ ] Test Alexa+ opportunity search
- [ ] Build simulated/demo experience
- [ ] Record final demo
- [ ] Verify hackathon requirements

---

## Documentation

- [x] Create `docs/README.md`
- [x] Create `docs/architecture.md`
- [ ] Create `docs/mcp.md`
- [ ] Create `docs/opportunities.md`
- [ ] Create `docs/providers.md`
- [x] Create health check tool documentation
- [ ] Create search opportunities tool documentation
- [ ] Create get opportunity documentation
- [ ] Create save opportunity documentation
- [ ] Create prepare opportunity documentation
- [ ] Create architecture decision records
- [ ] Document finalized response/error contracts
- [ ] Review root README against current implementation

---

## Codebase Cleanup

- [ ] Remove unused dependencies
- [ ] Review temporary debug logs
- [ ] Review duplicate domain type/schema definitions
- [ ] Review provider error handling
- [ ] Review test organization
- [ ] Review naming consistency
- [ ] Run full build and test suite
- [ ] Update repository structure documentation

---

## Future Opportunity Types

Not part of the current MVP.

- [ ] Scholarships
- [ ] Fellowships
- [ ] Grants
- [ ] Internships
- [ ] Accelerators
- [ ] Events
- [ ] Freelance opportunities
- [ ] Other opportunity sources

---

## Future Capabilities

Not part of the current MVP.

- [ ] Opportunity recommendations/personalization
- [ ] Application assistance
- [ ] CV/resume preparation
- [ ] Outreach/cold-DM workflows
- [ ] Opportunity tracking
- [ ] Notifications
- [ ] Browser automation
- [ ] Additional MCP clients
