"use client";

import { useEffect, useState, type ElementType } from "react";
import {
  Bot,
  Check,
  Compass,
  FileText,
  Layers3,
  Terminal,
  Workflow,
} from "lucide-react";

type Item = {
  title: string;
  href: string;
  icon: ElementType;
  children?: { title: string; href: string }[];
};

const contents: Item[] = [
  { title: "Why ROUTE", href: "#why-route", icon: FileText },
  {
    title: "How to use ROUTE",
    href: "#how-to-use-route",
    icon: Bot,
    children: [
      { title: "For users", href: "#for-users" },
      { title: "For developers", href: "#for-developers" },
    ],
  },
  {
    title: "Architecture overview",
    href: "#architecture-overview",
    icon: Layers3,
  },
  {
    title: "Opportunity lifecycle",
    href: "#opportunity-lifecycle",
    icon: Workflow,
  },
  {
    title: "Opportunity coverage",
    href: "#opportunity-coverage",
    icon: Compass,
  },
  { title: "Design principles", href: "#design-principles", icon: Check },
  { title: "Getting started", href: "#getting-started", icon: Terminal },
];

const sectionIds = contents.map((i) => i.href.slice(1));
const SPY_OFFSET = 96; // sticky top bar + breathing room

function Dot({ className = "bg-white/30" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-1.5 shrink-0 rounded-full ${className}`}
    />
  );
}

export function PropertiesPanel() {
  const [active, setActive] = useState<string>(sectionIds[0]);
  const [activeChild, setActiveChild] = useState<string | null>(null);

  // Scroll-spy: the active section is the last one whose top has passed the offset.
  useEffect(() => {
    const els = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const update = () => {
      let current = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top - SPY_OFFSET <= 0) current = el.id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) current = els[els.length - 1].id;

      setActive(current);
      // Drop the sub-item highlight once we leave its parent section.
      setActiveChild((child) => {
        if (!child) return child;
        const parent = contents.find((i) =>
          i.children?.some((c) => c.href === `#${child}`),
        );
        return parent?.href === `#${current}` ? child : null;
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const label = "mb-2 text-[11px] text-white/35";

  return (
    <aside className="sticky top-11 hidden h-[calc(100vh-2.75rem)] self-start overflow-y-auto border-l border-white/[0.06] px-5 py-8 lg:block">
      <p className={label}>On this page</p>

      <ul className="space-y-0.5">
        {contents.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.href.slice(1);

          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={isActive && !activeChild ? "location" : undefined}
                onClick={() => {
                  setActive(item.href.slice(1));
                  setActiveChild(null);
                }}
                className={`flex items-center gap-2.5 rounded px-1.5 py-1.5 text-xs transition ${
                  isActive
                    ? "bg-white/[0.07] text-white"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon
                  className={`size-3.5 transition ${
                    isActive ? "text-blue-300" : "text-white/40"
                  }`}
                />
                {item.title}
              </a>

              {item.children && (
                <ul className="ml-[19px] border-l border-white/[0.07] pl-3">
                  {item.children.map((c) => {
                    const childActive = activeChild === c.href.slice(1);
                    return (
                      <li key={c.href}>
                        <a
                          href={c.href}
                          aria-current={childActive ? "location" : undefined}
                          onClick={() => {
                            setActive(item.href.slice(1));
                            setActiveChild(c.href.slice(1));
                          }}
                          className={`-ml-[13px] block border-l py-1 pl-3 text-[11px] transition ${
                            childActive
                              ? "border-blue-300 text-white"
                              : "border-transparent text-white/40 hover:text-white/80"
                          }`}
                        >
                          {c.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <p className={label}>Status</p>
        <div className="flex items-center gap-2.5 px-1.5 text-xs text-white/70">
          <Dot className="bg-emerald-400" />
          Open source
        </div>
      </div>

      <div className="mt-6">
        <p className={label}>Project</p>
        <div className="flex items-center gap-2.5 px-1.5 text-xs text-white/70">
          <Layers3 className="size-3.5 text-red-400" />
          ROUTE MCP Server
        </div>
      </div>

      <div className="mt-6">
        <p className={label}>Initial scope</p>
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
      </div>
    </aside>
  );
}
