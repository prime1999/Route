import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Layers3,
  Network,
  Search,
  Server,
  Terminal,
  Workflow,
} from "lucide-react";
import {
  PanelBlock,
  TocPanel,
  type TocItem,
} from "@/components/docs/architecture/toc-panel";

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const tocItems: TocItem[] = [
  { title: "Scope", href: "#scope", icon: "layers" },
  {
    title: "Architecture concepts",
    href: "#architecture-concepts",
    icon: "network",
    children: [
      { title: "System participants", href: "#system-participants" },
      { title: "System layers", href: "#system-layers" },
      { title: "MCP transport layer", href: "#mcp-transport-layer" },
      { title: "Opportunity data model", href: "#opportunity-data-model" },
      { title: "Provider architecture", href: "#provider-architecture" },
    ],
  },
  {
    title: "Request lifecycle",
    href: "#request-lifecycle",
    icon: "workflow",
    children: [
      { title: "Discovery", href: "#discovery" },
      { title: "Retrieval", href: "#retrieval" },
      { title: "Saving", href: "#saving" },
      { title: "Preparation", href: "#preparation" },
    ],
  },
  {
    title: "Tool execution flow",
    href: "#tool-execution-flow",
    icon: "terminal",
  },
  { title: "Persistence", href: "#persistence", icon: "database" },
  { title: "Extensibility", href: "#extensibility", icon: "server" },
  {
    title: "Current scope and future direction",
    href: "#current-scope-and-future-direction",
    icon: "check",
  },
];

const participants = [
  {
    title: "MCP client and agent",
    description:
      "Discovers available tools, supplies arguments, receives results, and decides how to use the returned information.",
    icon: Bot,
  },
  {
    title: "ROUTE MCP server",
    description:
      "Exposes the opportunity tools and coordinates their execution through application services.",
    icon: Server,
  },
  {
    title: "Opportunity providers",
    description:
      "Interact with supported external sources and convert source-specific information into ROUTE's common opportunity representation.",
    icon: Network,
  },
  {
    title: "Persistent state",
    description:
      "Supports saved-opportunity data independently of the external platforms from which opportunities are discovered.",
    icon: Database,
  },
];

const systemLayers = [
  {
    key: "01",
    label: "Layer 01",
    title: "MCP interface",
    description:
      "Exposes ROUTE capabilities as tools that compatible MCP clients can discover and invoke.",
    icon: Network,
  },
  {
    key: "02",
    label: "Layer 02",
    title: "Opportunity services",
    description:
      "Coordinates opportunity operations and delegates provider-specific work to the provider manager.",
    icon: Workflow,
  },
  {
    key: "03",
    label: "Layer 03",
    title: "Provider layer",
    description:
      "Resolves supported opportunity sources, retrieves source data, and normalizes results into a shared model.",
    icon: Layers3,
  },
  {
    key: "04",
    label: "Layer 04",
    title: "Persistence",
    description:
      "Stores saved opportunity state separately from the external sources used to discover opportunities.",
    icon: Database,
  },
];

const dataModel = [
  ["id", "Identifies the normalized opportunity."],
  ["title", "The opportunity's displayed title."],
  ["type", "The current category, such as job or hackathon."],
  ["organization", "The organization associated with it."],
  ["description", "Available descriptive information."],
  ["url", "The opportunity's canonical destination."],
  ["source", "Identifies the provider or originating source."],
  ["sourceUrl", "Identifies the source endpoint or reference."],
  [
    "Optional fields",
    "May include location, remote status, deadline, prize, and metadata.",
  ],
];

const providerFlow = [
  {
    title: "Opportunity service",
    description:
      "Coordinates the requested operation and delegates source resolution.",
  },
  {
    title: "Provider manager",
    description:
      "Determines which provider can handle the opportunity or request.",
  },
  {
    title: "Source provider",
    description:
      "Fetches and parses source-specific data, then returns a normalized opportunity.",
  },
];

const requestStages = [
  {
    key: "01",
    title: "Client request",
    description:
      "An MCP client invokes a ROUTE tool with the arguments required for the operation.",
  },
  {
    key: "02",
    title: "Tool validation",
    description:
      "The tool validates its inputs and routes the request to the appropriate application service.",
  },
  {
    key: "03",
    title: "Service and provider",
    description:
      "The service coordinates the operation. For source-backed operations, the provider layer handles source-specific retrieval and normalization.",
  },
  {
    key: "04",
    title: "Structured result",
    description:
      "ROUTE returns the operation result to the MCP client, which makes the information available to its connected agent or application.",
  },
];

const executionSteps = [
  "The MCP client selects a tool and supplies its arguments.",
  "The tool validates the arguments and invokes the appropriate operation.",
  "The service coordinates provider retrieval or saved-state operations as required.",
  "The result is returned to the MCP client for use by the connected agent or application.",
];

const extensionSteps = [
  {
    title: "Add a provider",
    description:
      "Implement the shared provider contract for a new external source, including its supported lookup, search, and preparation behavior.",
  },
  {
    title: "Normalize the source",
    description:
      "Map source-specific fields into the common Opportunity model and preserve source references needed for retrieval.",
  },
  {
    title: "Connect the capability",
    description:
      "Integrate the provider through the provider manager and relevant services rather than embedding source-specific logic in the MCP tool.",
  },
  {
    title: "Test the full path",
    description:
      "Verify source parsing, normalization, tool behavior, failure handling, and any persistence requirements before documenting the capability as implemented.",
  },
];

const currentCapabilities = [
  "Opportunity discovery and retrieval",
  "Saving opportunities",
  "Main opportunity preparation context",
  "Provider-based normalization",
  "MCP access through Streamable HTTP",
];

const futureDirections = [
  "Deeper preparation sub-tools",
  "Additional opportunity categories and providers",
  "Expanded workflow and progress tracking",
  "Agent orchestration and longer-running workflows",
  "Additional integrations and deployment hardening",
];

/* -------------------------------------------------------------------------- */
/*  Shared bits                                                               */
/* -------------------------------------------------------------------------- */

const BG = "bg-[#0e0e10]";
const card = "rounded-md border border-white/[0.07] bg-white/[0.02]";

function Dot({ className = "bg-white/30" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-1.5 shrink-0 rounded-full ${className}`}
    />
  );
}

function Section({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-white/[0.06] py-8">
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="text-[13px] font-medium text-white/90">{title}</h2>
        {meta && <span className="text-xs text-white/35">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function SubSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="mt-9 scroll-mt-16">
      <h3 className="mb-3 text-[13px] font-medium text-white/90">{title}</h3>
      {children}
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-[15px] font-semibold leading-snug text-white">
      {children}
    </h3>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-2xl text-[13px] leading-6 text-white/50">{children}</p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-blue-200">
      {children}
    </code>
  );
}

function Avatar({ icon: Icon }: { icon: ElementType }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
      <Icon className="size-3 text-white/70" />
    </span>
  );
}

/** Vertical activity-feed style list. Circle shows an icon, or the number. */
function Timeline({
  items,
}: {
  items: {
    key: string;
    label?: string;
    title: string;
    description: string;
    icon?: ElementType;
  }[];
}) {
  return (
    <ol className="relative ml-2.5 border-l border-white/[0.08]">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.key} className="relative pb-6 pl-7 last:pb-0">
            <span
              className={`absolute -left-[11px] top-0 flex size-[22px] items-center justify-center rounded-full border border-white/10 ${BG}`}
            >
              {Icon ? (
                <Icon className="size-3 text-white/60" />
              ) : (
                <span className="font-mono text-[9px] text-white/50">
                  {item.key}
                </span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {item.label && (
                <span className="font-mono text-[10px] uppercase text-white/30">
                  {item.label}
                </span>
              )}
              <h4 className="text-[13px] font-medium text-white/90">
                {item.title}
              </h4>
            </div>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/45">
              {item.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chrome                                                                    */
/* -------------------------------------------------------------------------- */

function TopBar() {
  const action =
    "inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-white/55 transition hover:bg-white/[0.05] hover:text-white";
  return (
    <header
      className={`sticky top-0 z-10 flex h-11 items-center justify-between border-b border-white/[0.06] ${BG}/90 px-6 backdrop-blur`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-white/45">
        <Link href="/docs" className="transition hover:text-white/80">
          Docs
        </Link>
        <ChevronRight className="size-3 text-white/25" />
        <span className="inline-flex items-center gap-1 text-white/80">
          Architecture
          <ChevronDown className="size-3 text-white/35" />
        </span>
      </div>

      <nav className="flex items-center gap-1">
        <Link href="/docs/tools" className={action}>
          <Layers3 className="size-3.5" />
          Tools
        </Link>
        <Link href="/docs/connection" className={action}>
          <Bot className="size-3.5" />
          Connect
        </Link>
      </nav>
    </header>
  );
}

function ArchitecturePanel() {
  return (
    <TocPanel items={tocItems}>
      <PanelBlock label="Transport">
        <div className="flex items-center gap-2.5 px-1.5 text-xs text-white/70">
          <Network className="size-3.5 text-blue-300" />
          Streamable HTTP
        </div>
      </PanelBlock>

      <PanelBlock label="Persistence">
        <div className="flex items-center gap-2.5 px-1.5 text-xs text-white/70">
          <Database className="size-3.5 text-red-400" />
          DynamoDB
        </div>
      </PanelBlock>

      <PanelBlock label="Providers">
        <div className="flex flex-wrap gap-1.5">
          {["Remote OK", "Devpost"].map((l, i) => (
            <span
              key={l}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2 py-0.5 text-[11px] text-white/70"
            >
              <Dot className={i === 0 ? "bg-blue-400" : "bg-violet-400"} />
              {l}
            </span>
          ))}
        </div>
      </PanelBlock>
    </TocPanel>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function DocsArchitecturePage() {
  return (
    <div className={`w-full ${BG} text-white`}>
      <TopBar />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="min-w-0 px-6 py-8 sm:px-10">
          <div className="max-w-3xl">
            {/* Title block */}
            <header className="pb-8">
              <p className="mb-3 text-[11px] text-white/35">
                Technical documentation
              </p>
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight">
                Architecture
              </h1>
              <p className="mt-4 max-w-2xl text-[13px] leading-6 text-white/50">
                Understand how ROUTE connects MCP clients to opportunity
                services, provider integrations, and persistent
                saved-opportunity state. This page describes the current
                architecture and distinguishes implemented capabilities from
                future directions.
              </p>
            </header>

            {/* Scope */}
            <Section id="scope" title="Scope" meta="Boundary">
              <Heading>A shared opportunity infrastructure layer</Heading>
              <Lead>
                ROUTE is an agent-agnostic MCP server. It exposes focused tools
                for discovering opportunities, retrieving details, saving
                opportunities, and gathering preparation context. The connected
                agent or application remains responsible for its own reasoning,
                user experience, and higher-level workflow orchestration.
              </Lead>

              <div className={`${card} mt-6 flex gap-3 p-4`}>
                <Layers3 className="mt-0.5 size-4 shrink-0 text-blue-300" />
                <div>
                  <h3 className="text-[13px] font-medium text-white/90">
                    Architectural boundary
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-white/45">
                    ROUTE supplies opportunity capabilities through MCP. It is
                    not itself the conversational agent, and the current
                    implementation should not be treated as an autonomous
                    application-submission or opportunity-tracking system.
                  </p>
                </div>
              </div>
            </Section>

            {/* Architecture concepts */}
            <Section
              id="architecture-concepts"
              title="Architecture concepts"
              meta="5 concepts"
            >
              <Lead>
                ROUTE separates the client-facing protocol interface from
                opportunity operations, external data sources, and persistent
                state. Each part has a distinct responsibility.
              </Lead>

              <SubSection id="system-participants" title="System participants">
                <div className="grid gap-3 sm:grid-cols-2">
                  {participants.map((p) => (
                    <div key={p.title} className={`${card} p-4`}>
                      <div className="flex items-center gap-2.5">
                        <Avatar icon={p.icon} />
                        <h4 className="text-xs font-medium text-white/85">
                          {p.title}
                        </h4>
                      </div>
                      <p className="mt-2.5 text-xs leading-5 text-white/45">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </SubSection>

              <SubSection id="system-layers" title="System layers">
                <Timeline items={systemLayers} />
              </SubSection>

              <SubSection id="mcp-transport-layer" title="MCP transport layer">
                <Lead>
                  ROUTE uses the Model Context Protocol to expose tools to
                  compatible clients. Its configured HTTP transport is
                  Streamable HTTP, which carries MCP communication between the
                  client and server.
                </Lead>

                <div className={`${card} mt-4 p-4`}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/65">
                      MCP client
                    </span>
                    <ArrowRight className="size-3.5 text-white/30" />
                    <span className="rounded-md border border-blue-400/20 bg-blue-400/[0.06] px-2.5 py-1.5 font-mono text-[11px] text-blue-200">
                      Streamable HTTP
                    </span>
                    <ArrowRight className="size-3.5 text-white/30" />
                    <span className="rounded-md border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/65">
                      ROUTE server
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-white/35">
                    The transport provides the communication channel. The
                    opportunity tools define the operations available through
                    that channel.
                  </p>
                </div>

                <a
                  href="https://modelcontextprotocol.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-300 transition hover:text-blue-200"
                >
                  MCP documentation
                  <ExternalLink className="size-3" />
                </a>
              </SubSection>

              <SubSection
                id="opportunity-data-model"
                title="Opportunity data model"
              >
                <Lead>
                  Providers normalize their source data into a common
                  opportunity representation. This reduces the need for clients
                  to understand each external platform&apos;s individual data
                  structure.
                </Lead>

                <div className={`${card} mt-4 overflow-hidden`}>
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-white/[0.06] px-3.5 py-2 text-[11px] text-white/35">
                    <span>Field</span>
                    <span>Purpose</span>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {dataModel.map(([field, description]) => (
                      <div
                        key={field}
                        className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-3 px-3.5 py-2.5"
                      >
                        <code className="text-[11px] text-blue-200">
                          {field}
                        </code>
                        <p className="text-xs leading-5 text-white/45">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-white/30">
                  Optional fields depend on the data supplied by the source.
                  Normalization does not guarantee that every provider has every
                  field.
                </p>
              </SubSection>

              <SubSection
                id="provider-architecture"
                title="Provider architecture"
              >
                <Lead>
                  Provider-specific behavior belongs behind a shared provider
                  interface. The opportunity service delegates retrieval to the
                  provider manager rather than embedding source-specific parsing
                  logic in each MCP tool.
                </Lead>

                <div className={`${card} mt-4 divide-y divide-white/[0.06]`}>
                  {providerFlow.map((item, i) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 px-3.5 py-3"
                    >
                      <span className="mt-0.5 font-mono text-[10px] text-white/30">
                        0{i + 1}
                      </span>
                      <div>
                        <h4 className="text-[13px] text-white/85">
                          {item.title}
                        </h4>
                        <p className="mt-0.5 text-xs leading-5 text-white/40">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SubSection>
            </Section>

            {/* Request lifecycle */}
            <Section
              id="request-lifecycle"
              title="Request lifecycle"
              meta="4 stages · 4 operations"
            >
              <Lead>
                A request begins with an MCP client, passes through the relevant
                ROUTE tool and service, and returns a structured result. The
                exact execution path depends on the tool being called.
              </Lead>

              <div className="mt-7">
                <Timeline items={requestStages} />
              </div>

              <SubSection id="discovery" title="Discovery">
                <Lead>
                  The client invokes <Code>search_opportunities</Code> with
                  supported search criteria. ROUTE queries the relevant
                  providers, normalizes returned records, and provides results
                  for the connected agent to evaluate.
                </Lead>
              </SubSection>

              <SubSection id="retrieval" title="Retrieval">
                <Lead>
                  The client can invoke <Code>get_opportunity</Code> to retrieve
                  an individual opportunity by its supported reference, such as
                  its URL. The service delegates source resolution and retrieval
                  to the provider layer.
                </Lead>
              </SubSection>

              <SubSection id="saving" title="Saving">
                <Lead>
                  The <Code>save_opportunity</Code> tool handles saving an
                  opportunity for later use. This operation concerns
                  ROUTE&apos;s saved-opportunity state rather than creating or
                  modifying a listing on the original external platform.
                </Lead>
              </SubSection>

              <SubSection id="preparation" title="Preparation">
                <Lead>
                  The <Code>prepare_opportunity</Code> tool retrieves the main
                  preparation context available for an opportunity. Planned
                  preparation sub-tools can expand the information collected
                  from relevant pages and resources. The connected agent can use
                  the returned context to help a user understand requirements
                  and plan next steps.
                </Lead>
              </SubSection>
            </Section>

            {/* Tool execution */}
            <Section
              id="tool-execution-flow"
              title="Tool execution flow"
              meta="4 steps"
            >
              <Lead>
                ROUTE keeps MCP tool handlers focused on accepting requests and
                returning results, while application services and providers own
                the relevant operation logic.
              </Lead>

              <div className={`${card} mt-6 p-4`}>
                <ol className="space-y-3">
                  {executionSteps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="mt-0.5 font-mono text-[10px] text-white/30">
                        0{i + 1}
                      </span>
                      <p className="text-xs leading-5 text-white/55">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-4 max-w-2xl text-[13px] leading-6 text-white/45">
                This separation makes it possible to extend source support
                without making every MCP tool responsible for every external
                platform. Each tool should still have a clear contract,
                validated inputs, and predictable output behavior.
              </p>
            </Section>

            {/* Persistence */}
            <Section id="persistence" title="Persistence" meta="Saved state">
              <Heading>Persistence and saved opportunities</Heading>
              <Lead>
                External opportunity listings and ROUTE&apos;s saved-opportunity
                records serve different purposes. External sources provide the
                listings; ROUTE&apos;s persistence layer stores the saved state
                needed by its own capabilities.
              </Lead>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className={`${card} p-4`}>
                  <div className="flex items-center gap-2.5">
                    <Avatar icon={Search} />
                    <h4 className="text-xs font-medium text-white/85">
                      External opportunity data
                    </h4>
                  </div>
                  <p className="mt-2.5 text-xs leading-5 text-white/45">
                    Retrieved from supported sources. Its availability and
                    completeness depend on those sources.
                  </p>
                </div>

                <div className={`${card} p-4`}>
                  <div className="flex items-center gap-2.5">
                    <Avatar icon={Database} />
                    <h4 className="text-xs font-medium text-white/85">
                      Saved-opportunity state
                    </h4>
                  </div>
                  <p className="mt-2.5 text-xs leading-5 text-white/45">
                    Stored separately to support saving and retrieving
                    opportunities within ROUTE.
                  </p>
                </div>
              </div>

              <div className={`${card} mt-4 flex gap-3 p-4`}>
                <Dot className="mt-1.5 bg-amber-400" />
                <p className="text-xs leading-5 text-white/50">
                  ROUTE uses DynamoDB for persistent state. A production
                  deployment must configure the required AWS resources and
                  permissions. Authentication, user-to-agent identity mapping,
                  and access isolation must be designed and verified separately
                  before assuming saved records are securely scoped to
                  individual users.
                </p>
              </div>
            </Section>

            {/* Extensibility */}
            <Section id="extensibility" title="Extensibility" meta="4 steps">
              <Heading>Extending ROUTE</Heading>
              <Lead>
                ROUTE is designed to grow through new providers and focused
                capabilities while preserving the common opportunity interface.
              </Lead>

              <div className="mt-7">
                <Timeline
                  items={extensionSteps.map((s, i) => ({
                    ...s,
                    key: `0${i + 1}`,
                  }))}
                />
              </div>
            </Section>

            {/* Current scope */}
            <Section
              id="current-scope-and-future-direction"
              title="Current scope and future direction"
              meta="Implemented · Planned"
            >
              <Lead>
                The architecture is designed to support broader opportunity
                workflows, but the documentation should distinguish what is
                implemented now from what remains planned.
              </Lead>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className={`${card} p-4`}>
                  <div className="flex items-center gap-2">
                    <Dot className="bg-emerald-400" />
                    <h3 className="text-xs font-medium text-white/85">
                      Current capabilities
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {currentCapabilities.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2 text-xs leading-5 text-white/55"
                      >
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400/80" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`${card} p-4`}>
                  <div className="flex items-center gap-2">
                    <Dot className="bg-white/25" />
                    <h3 className="text-xs font-medium text-white/85">
                      Future directions
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {futureDirections.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs leading-5 text-white/45"
                      >
                        <Workflow className="mt-0.5 size-3.5 shrink-0 text-white/30" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-[11px] leading-5 text-white/30">
                The current/future distinction should be updated as features are
                implemented and tested. The presence of an architectural
                extension point does not mean a corresponding user-facing
                capability is already available.
              </p>
            </Section>

            {/* Next steps */}
            <section className="border-t border-white/[0.06] py-8">
              <div className="mb-5 flex items-baseline gap-3">
                <h2 className="text-[13px] font-medium text-white/90">
                  Continue exploring
                </h2>
                <span className="text-xs text-white/35">2 pages</span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    title: "MCP tools",
                    description: "Explore the tool contracts and capabilities.",
                    href: "/docs/tools",
                    icon: Layers3,
                  },
                  {
                    title: "Connect to ROUTE",
                    description: "Configure a compatible MCP client.",
                    href: "/docs/connection",
                    icon: Terminal,
                  },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${card} group flex items-center gap-3 px-3.5 py-3 transition hover:border-white/15 hover:bg-white/[0.035]`}
                  >
                    <Avatar icon={link.icon} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-white/85">{link.title}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {link.description}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Footer */}
            <footer className="flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
              <p>ROUTE — Opportunity infrastructure for AI agents.</p>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 transition hover:text-white/70"
              >
                Back to Introduction
                <ChevronRight className="size-3.5" />
              </Link>
            </footer>
          </div>
        </main>

        <ArchitecturePanel />
      </div>
    </div>
  );
}
