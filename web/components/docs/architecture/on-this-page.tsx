import { Layers3 } from "lucide-react";
import {
  PanelBlock,
  TocPanel,
  type TocItem,
} from "@/components/docs/architecture/toc-panel";

const items: TocItem[] = [
  { title: "Why ROUTE", href: "#why-route", icon: "file" },
  {
    title: "How to use ROUTE",
    href: "#how-to-use-route",
    icon: "bot",
    children: [
      { title: "For users", href: "#for-users" },
      { title: "For developers", href: "#for-developers" },
    ],
  },
  {
    title: "Architecture overview",
    href: "#architecture-overview",
    icon: "layers",
  },
  {
    title: "Opportunity lifecycle",
    href: "#opportunity-lifecycle",
    icon: "workflow",
  },
  {
    title: "Opportunity coverage",
    href: "#opportunity-coverage",
    icon: "compass",
  },
  { title: "Design principles", href: "#design-principles", icon: "check" },
  { title: "Getting started", href: "#getting-started", icon: "terminal" },
];

function Dot({ className = "bg-white/30" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-1.5 shrink-0 rounded-full ${className}`}
    />
  );
}

export function PropertiesPanel() {
  return (
    <TocPanel items={items}>
      <PanelBlock label="Status">
        <div className="flex items-center gap-2.5 px-1.5 text-xs text-white/70">
          <Dot className="bg-emerald-400" />
          Open source
        </div>
      </PanelBlock>

      <PanelBlock label="Project">
        <div className="flex items-center gap-2.5 px-1.5 text-xs text-white/70">
          <Layers3 className="size-3.5 text-red-400" />
          ROUTE MCP Server
        </div>
      </PanelBlock>

      <PanelBlock label="Initial scope">
        <div className="flex flex-wrap gap-1.5">
          {["Jobs", "Hackathons"].map((l, i) => (
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
