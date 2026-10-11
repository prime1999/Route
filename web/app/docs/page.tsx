import Link from "next/link";
import type { ElementType } from "react";
import {
  ArrowDown,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Database,
  ExternalLink,
  FileText,
  Layers3,
  Search,
  Terminal,
  Workflow,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { PropertiesPanel } from "@/components/docs/on-this-page";

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const lifecycle = [
  {
    number: "01",
    title: "Discover",
    status: "Implemented",
    description:
      "Search supported opportunity sources and receive structured, normalized results that agents can work with.",
    example: '"Find remote jobs and upcoming hackathons."',
    icon: Search,
    implemented: true,
  },
  {
    number: "02",
    title: "Understand",
    status: "Implemented",
    description:
      "Retrieve an opportunity's details, including its description, organization, deadline, location, source, and other available information.",
    example: '"Tell me more about this opportunity."',
    icon: FileText,
    implemented: true,
  },
  {
    number: "03",
    title: "Save",
    status: "Implemented",
    description:
      "Save opportunities for later use. Saved opportunity state is separate from the global sources used for discovery.",
    example: '"Save this opportunity for me."',
    icon: Database,
    implemented: true,
  },
  {
    number: "04",
    title: "Prepare",
    status: "Implemented",
    description:
      "Retrieve the main preparation context needed to get started with an opportunity. Planned sub-tools will extend this capability by retrieving deeper information from additional pages and resources.",
    example: '"What requirements should I understand before applying?"',
    icon: Layers3,
    implemented: true,
  },
  {
    number: "05",
    title: "Act",
    status: "Future direction",
    description:
      "Enable connected agents and applications to use opportunity context when helping users draft applications, plan projects, and work through next steps.",
    example: '"Help me prepare a strong application for this opportunity."',
    icon: Workflow,
    implemented: false,
  },
  {
    number: "06",
    title: "Track",
    status: "Future direction",
    description:
      "Explore workflows for tracking applications, deadlines, progress, opportunity updates, and follow-up actions.",
    example: '"Help me keep track of the opportunities I am pursuing."',
    icon: Compass,
    implemented: false,
  },
];

const principles = [
  {
    number: "01",
    title: "MCP first",
    description:
      "ROUTE is fundamentally an MCP server. Its interfaces and integrations consume the infrastructure rather than define it.",
  },
  {
    number: "02",
    title: "Agent agnostic",
    description:
      "ROUTE is designed to work with compatible MCP clients instead of requiring a particular AI assistant.",
  },
  {
    number: "03",
    title: "Provider independent",
    description:
      "External platforms are isolated behind providers that normalize their information into a common opportunity model.",
  },
  {
    number: "04",
    title: "Composable capabilities",
    description:
      "Focused tools can be combined by agents into larger workflows without turning ROUTE into a monolithic agent.",
  },
];

const opportunityCategories = [
  {
    title: "Jobs",
    description: "Employment, remote work, and career opportunities.",
    current: true,
  },
  {
    title: "Hackathons",
    description: "Competitions, challenges, and build events.",
    current: true,
  },
  {
    title: "Scholarships",
    description: "Funding opportunities for education.",
    current: false,
  },
  {
    title: "Grants",
    description: "Funding for projects, research, and initiatives.",
    current: false,
  },
  {
    title: "Fellowships",
    description: "Academic, professional, and research programs.",
    current: false,
  },
  {
    title: "Internships",
    description: "Early-career and practical work experience.",
    current: false,
  },
  {
    title: "Accelerators",
    description: "Programs that help startups and founders grow.",
    current: false,
  },
  {
    title: "Freelance",
    description: "Contract work and independent projects.",
    current: false,
  },
  {
    title: "And more",
    description: "Additional categories as the provider ecosystem grows.",
    current: false,
  },
];

const gettingStarted = [
  {
    number: "01",
    title: "Quickstart",
    description: "Set up ROUTE and learn how to make your first request.",
    href: "/docs/quickstart",
    icon: Terminal,
  },
  {
    number: "02",
    title: "Connect an MCP client",
    description: "Learn how a compatible AI application connects to ROUTE.",
    href: "/docs/connection",
    icon: Bot,
  },
  {
    number: "03",
    title: "Explore the tools",
    description:
      "Understand the available tools, their inputs, and their outputs.",
    href: "/docs/tools",
    icon: Layers3,
  },
];

const userSteps = [
  {
    number: "01",
    title: "Connect",
    description: "Configure your AI application to connect to ROUTE.",
  },
  {
    number: "02",
    title: "Discover",
    description:
      "Ask your assistant to find opportunities that match your request.",
  },
  {
    number: "03",
    title: "Explore and save",
    description:
      "Retrieve details, compare options, and save opportunities for later.",
  },
  {
    number: "04",
    title: "Prepare",
    description:
      "Use available opportunity context to understand requirements and plan your next steps.",
  },
];

const devSteps = [
  {
    number: "01",
    title: "Run ROUTE",
    description: "Start the MCP server locally or deploy an accessible server.",
  },
  {
    number: "02",
    title: "Connect your client",
    description:
      "Configure your MCP-compatible client to communicate through Streamable HTTP.",
  },
  {
    number: "03",
    title: "Compose capabilities",
    description:
      "Use discovery, retrieval, saving, and preparation tools within your application or agent workflow.",
  },
  {
    number: "04",
    title: "Extend the system",
    description:
      "Build your own experience or contribute providers and capabilities to the opportunity ecosystem.",
  },
];

const clients = [
  {
    title: "AI assistants",
    description: "Conversational experiences",
    icon: Bot,
  },
  { title: "IDE agents", description: "Developer workflows", icon: Terminal },
  {
    title: "Custom applications",
    description: "Purpose-built experiences",
    icon: BriefcaseBusiness,
  },
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
  children: React.ReactNode;
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

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[15px] font-semibold leading-snug text-white">
      {children}
    </h3>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-2xl text-[13px] leading-6 text-white/50">{children}</p>
  );
}

function Avatar({ icon: Icon }: { icon: ElementType }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
      <Icon className="size-3 text-white/70" />
    </span>
  );
}

function Steps({
  steps,
}: {
  steps: { number: string; title: string; description: string }[];
}) {
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.number} className="flex gap-3">
          <span className="mt-0.5 font-mono text-[10px] text-white/30">
            {s.number}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-white/80">{s.title}</p>
            <p className="mt-0.5 text-xs leading-5 text-white/40">
              {s.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      <span className="h-2 w-px bg-white/15" />
      {label && (
        <span className="my-1 rounded border border-blue-400/20 bg-blue-400/[0.06] px-2 py-0.5 font-mono text-[10px] text-blue-200">
          {label}
        </span>
      )}
      <ArrowDown className="size-3.5 text-white/30" />
    </div>
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
        <span>Docs</span>
        <ChevronRight className="size-3 text-white/25" />
        <span className="inline-flex items-center gap-1 text-white/80">
          Introduction
          <ChevronDown className="size-3 text-white/35" />
        </span>
      </div>

      <nav className="flex items-center gap-1">
        <Link href="/docs/quickstart" className={action}>
          <Terminal className="size-3.5" />
          Quickstart
        </Link>
        <Link href="/docs/connection" className={action}>
          <Bot className="size-3.5" />
          Connect
        </Link>
        <Link
          href="https://github.com/prime1999/Route"
          target="_blank"
          rel="noopener noreferrer"
          className={action}
        >
          <FaGithub className="size-3.5" />
          GitHub
        </Link>
      </nav>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function DocsIntroductionPage() {
  return (
    <div className={`w-full ${BG} text-white`}>
      <TopBar />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="min-w-0 px-6 py-8 sm:px-10">
          <div className="max-w-3xl">
            {/* Title block */}
            <header className="pb-8">
              <p className="mb-3 text-[11px] text-white/35">Introduction</p>
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight">
                Opportunity infrastructure for AI agents.
              </h1>
              <p className="mt-4 max-w-2xl text-[13px] leading-6 text-white/50">
                An open-source MCP server for discovering, understanding, and
                acting on opportunities. ROUTE gives AI agents and developers
                structured access to opportunities across different categories
                and sources through a common interface.
              </p>

              <div
                className={`${card} mt-6 flex items-center justify-between gap-4 px-3 py-2.5 text-xs`}
              >
                <span className="flex min-w-0 items-center gap-2 text-white/60">
                  <Dot className="bg-emerald-400" />
                  <span className="truncate">
                    Open source · Agent agnostic · MCP infrastructure
                  </span>
                </span>
                <Link
                  href="https://github.com/prime1999/Route"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 text-white/40 transition hover:text-white"
                >
                  Repository
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </header>

            {/* Why ROUTE */}
            <Section id="why-route" title="Why ROUTE" meta="The problem">
              <Heading>
                Opportunities are everywhere. Access is fragmented.
              </Heading>
              <div className="max-w-2xl space-y-4 text-[13px] leading-6 text-white/50">
                <p>
                  Jobs live on job boards. Hackathons live on developer
                  platforms. Scholarships, grants, fellowships, internships, and
                  accelerators are spread across organization websites and
                  specialized platforms.
                </p>
                <p>
                  This fragmentation makes it difficult for people and AI agents
                  to discover opportunities, retrieve their details, and
                  understand what it takes to pursue them.
                </p>
                <p>
                  An agent may understand a user&apos;s goals, but it still
                  needs access to the opportunity itself. Every external
                  platform introduces its own data formats, pages, and
                  information structure.
                </p>
                <p className="text-white/80">
                  ROUTE addresses this access problem with a common interface
                  for opportunity discovery, retrieval, saving, and preparation.
                  The goal is not another job board. It is infrastructure that
                  other applications can build on.
                </p>
              </div>
            </Section>

            {/* How to use */}
            <Section
              id="how-to-use-route"
              title="How to use ROUTE"
              meta="2 ways to build"
            >
              <Heading>
                One infrastructure layer. Two ways to build with it.
              </Heading>
              <Lead>
                ROUTE connects opportunity sources to AI-powered experiences.
                You can use it through a compatible AI application or integrate
                its capabilities into an application of your own.
              </Lead>

              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                <article
                  id="for-users"
                  className={`${card} scroll-mt-16 flex flex-col p-4`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar icon={Bot} />
                    <span className="text-xs font-medium text-white/80">
                      For users
                    </span>
                    <span className="text-[11px] text-white/30">
                      AI assistant
                    </span>
                  </div>
                  <h4 className="mt-3 text-[13px] font-medium text-white">
                    Find opportunities with your AI assistant.
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Connect a compatible MCP client to a running ROUTE server.
                    Your assistant can then use ROUTE&apos;s tools to discover
                    opportunities, retrieve their details, save interesting
                    options, and gather preparation context.
                  </p>

                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <Steps steps={userSteps} />
                  </div>

                  <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-white/35">
                    Your AI assistant provides the conversation and reasoning.
                    ROUTE provides the opportunity tools and data. Further
                    automation depends on the capabilities and permissions of
                    the connected agent.
                  </p>

                  <div className="mt-auto pt-4">
                    <Link
                      href="/docs/connection"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-500"
                    >
                      Connect ROUTE
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </article>

                <article
                  id="for-developers"
                  className={`${card} scroll-mt-16 flex flex-col p-4`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar icon={Terminal} />
                    <span className="text-xs font-medium text-white/80">
                      For developers
                    </span>
                    <span className="text-[11px] text-white/30">
                      Streamable HTTP
                    </span>
                  </div>
                  <h4 className="mt-3 text-[13px] font-medium text-white">
                    Build opportunity-powered applications.
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Integrate ROUTE into your own AI application, agent, or
                    workflow. Use its MCP tools as a focused opportunity layer
                    while keeping your own application logic and user experience
                    under your control.
                  </p>

                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <Steps steps={devSteps} />
                  </div>

                  <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] leading-5 text-white/35">
                    ROUTE handles opportunity access. Your application remains
                    responsible for its own model, business logic, user
                    experience, authentication, and additional workflow
                    orchestration.
                  </p>

                  <div className="mt-auto pt-4">
                    <Link
                      href="/docs/quickstart"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]"
                    >
                      Start building
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </article>
              </div>
            </Section>

            {/* Architecture */}
            <Section
              id="architecture-overview"
              title="Architecture overview"
              meta="MCP · providers"
            >
              <Heading>One interface. Multiple opportunity sources.</Heading>
              <Lead>
                ROUTE uses the Model Context Protocol (MCP) to expose tools to
                compatible AI applications. Its provider architecture handles
                source-specific retrieval and normalization behind that
                interface.
              </Lead>

              <div className={`${card} mt-6 p-4`}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {clients.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div
                        key={c.title}
                        className="flex items-center gap-2.5 rounded-md border border-white/[0.07] px-3 py-2.5"
                      >
                        <Icon className="size-4 shrink-0 text-white/50" />
                        <div className="min-w-0">
                          <p className="truncate text-xs text-white/80">
                            {c.title}
                          </p>
                          <p className="truncate text-[11px] text-white/35">
                            {c.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Connector label="MCP · Streamable HTTP" />

                <div className="flex items-center gap-3 rounded-md border border-blue-400/20 bg-blue-500/[0.05] px-3 py-3">
                  <Layers3 className="size-4 shrink-0 text-blue-300" />
                  <div>
                    <p className="text-[13px] font-medium text-white">
                      ROUTE MCP Server
                    </p>
                    <p className="text-[11px] text-white/45">
                      Discover · Understand · Save · Prepare
                    </p>
                  </div>
                </div>

                <Connector />

                <div className="rounded-md border border-white/[0.07] p-3">
                  <div className="flex items-center gap-2">
                    <Database className="size-3.5 text-blue-300" />
                    <p className="text-xs font-medium text-white/85">
                      Opportunity providers
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-white/40">
                    External platforms and websites that publish opportunities
                    across different categories.
                  </p>

                  <div className="mt-3 divide-y divide-white/[0.06] rounded-md border border-white/[0.07]">
                    {[
                      { name: "Remote OK", note: "Job opportunity source" },
                      { name: "Devpost", note: "Hackathon opportunity source" },
                    ].map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="text-xs text-white/80">{p.name}</span>
                        <span className="text-[11px] text-white/35">
                          {p.note}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-[11px] text-white/35">
                    <Check className="size-3 text-blue-300" />
                    Source data is normalized into ROUTE&apos;s opportunity
                    model.
                  </p>
                </div>
              </div>

              <a
                href="https://modelcontextprotocol.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-300 transition hover:text-blue-200"
              >
                Learn about the Model Context Protocol
                <ExternalLink className="size-3" />
              </a>
            </Section>

            {/* Lifecycle */}
            <Section
              id="opportunity-lifecycle"
              title="Opportunity lifecycle"
              meta="6 stages · 4 implemented"
            >
              <Heading>From discovery to taking action.</Heading>
              <Lead>
                ROUTE is organized around the stages involved in pursuing an
                opportunity. Its core discovery and preparation capabilities are
                implemented, while broader action and tracking workflows remain
                part of the longer-term direction.
              </Lead>

              <ol className="relative mt-7 ml-2.5 border-l border-white/[0.08]">
                {lifecycle.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <li
                      key={stage.number}
                      className="relative pb-6 pl-7 last:pb-0"
                    >
                      <span
                        className={`absolute -left-[11px] top-0 flex size-[22px] items-center justify-center rounded-full border border-white/10 ${BG}`}
                      >
                        <Icon className="size-3 text-white/60" />
                      </span>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[10px] text-white/30">
                          {stage.number}
                        </span>
                        <h3 className="text-[13px] font-medium text-white/90">
                          {stage.title}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-white/55">
                          <Dot
                            className={
                              stage.implemented
                                ? "bg-emerald-400"
                                : "bg-white/25"
                            }
                          />
                          {stage.status}
                        </span>
                      </div>
                      <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/45">
                        {stage.description}
                      </p>
                      <p className="mt-1.5 text-[11px] text-white/30">
                        Example: {stage.example}
                      </p>
                    </li>
                  );
                })}
              </ol>

              <div className={`${card} mt-7 flex gap-3 p-4`}>
                <Layers3 className="mt-0.5 size-4 shrink-0 text-blue-300" />
                <div>
                  <h3 className="text-[13px] font-medium text-white/90">
                    Deeper opportunity context
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-white/45">
                    The current{" "}
                    <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[11px] text-blue-200">
                      prepare_opportunity
                    </code>{" "}
                    tool retrieves the main preparation context needed to get
                    started. Planned sub-tools will extend this capability by
                    retrieving deeper information that may be spread across
                    separate pages or resources. Depending on the opportunity,
                    this could include eligibility criteria, application
                    instructions, required documents, judging criteria, rules,
                    or supporting resources. The connected agent can use that
                    information to help the user make informed decisions and
                    plan their next steps.
                  </p>
                </div>
              </div>
            </Section>

            {/* Coverage */}
            <Section
              id="opportunity-coverage"
              title="Opportunity coverage"
              meta="9 categories · 2 in initial scope"
            >
              <Heading>
                One infrastructure layer. Many kinds of opportunities.
              </Heading>
              <Lead>
                ROUTE is designed to support a broad range of opportunities
                through a consistent interface. The initial implementation
                focuses on jobs and hackathons, with an architecture designed to
                accommodate additional categories and providers over time.
              </Lead>

              <div className={`${card} mt-6 divide-y divide-white/[0.06]`}>
                {opportunityCategories.map((c) => (
                  <div
                    key={c.title}
                    className="flex items-center gap-3 px-3.5 py-2.5 transition hover:bg-white/[0.02]"
                  >
                    <Dot
                      className={c.current ? "bg-emerald-400" : "bg-white/25"}
                    />
                    <span className="w-24 shrink-0 text-xs text-white/85">
                      {c.title}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-white/40">
                      {c.description}
                    </span>
                    <span className="shrink-0 text-[11px] text-white/35">
                      {c.current ? "Initial scope" : "Planned"}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] leading-5 text-white/30">
                Categories beyond jobs and hackathons represent the broader
                vision. Their availability will depend on the providers
                implemented.
              </p>
            </Section>

            {/* Principles */}
            <Section
              id="design-principles"
              title="Design principles"
              meta="4 principles"
            >
              <Heading>A small core built to grow.</Heading>
              <Lead>
                ROUTE is designed around a focused interface and an extensible
                architecture, so new sources and capabilities can be introduced
                without tying the system to one platform or AI application.
              </Lead>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {principles.map((p) => (
                  <div key={p.number} className={`${card} p-4`}>
                    <span className="font-mono text-[10px] text-white/30">
                      {p.number}
                    </span>
                    <h3 className="mt-2 text-[13px] font-medium text-white/90">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-white/45">
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Getting started */}
            <Section
              id="getting-started"
              title="Getting started"
              meta="3 steps"
            >
              <Heading>Connect your agent to ROUTE.</Heading>
              <Lead>
                Start with the setup guide, connect a compatible MCP client, and
                explore the tools available in the current implementation.
              </Lead>

              <div className="mt-6 space-y-2">
                {gettingStarted.map((step) => {
                  const Icon = step.icon;
                  return (
                    <Link
                      key={step.number}
                      href={step.href}
                      className={`${card} group flex items-center gap-3 px-3.5 py-3 transition hover:border-white/15 hover:bg-white/[0.035]`}
                    >
                      <Avatar icon={Icon} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-white/85">
                          <span className="mr-2 font-mono text-[10px] text-white/30">
                            {step.number}
                          </span>
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs text-white/40">
                          {step.description}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/docs/architecture"
                className="group mt-4 flex h-10 items-center justify-between rounded-md bg-white/[0.05] px-3.5 text-xs text-white/45 transition hover:bg-white/[0.07] hover:text-white/80"
              >
                Continue to Architecture…
                <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
            </Section>

            {/* Footer */}
            <footer className="flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
              <p>ROUTE — Opportunity infrastructure for AI agents.</p>
              <Link
                href="https://github.com/prime1999/Route"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-white/70"
              >
                <FaGithub className="size-3.5" />
                GitHub repository
                <ExternalLink className="size-3" />
              </Link>
            </footer>
          </div>
        </main>

        <PropertiesPanel />
      </div>
    </div>
  );
}
