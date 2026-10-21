"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  Check,
  Compass,
  Database,
  FileText,
  Layers3,
  Network,
  Search,
  Server,
  Terminal,
  Workflow,
} from "lucide-react";

/**
 * Icons are passed by name so a server component can describe the contents
 * without trying to send component functions across the client boundary.
 */
const icons = {
  bot: Bot,
  check: Check,
  compass: Compass,
  database: Database,
  file: FileText,
  layers: Layers3,
  network: Network,
  search: Search,
  server: Server,
  terminal: Terminal,
  workflow: Workflow,
} as const;

export type TocIconName = keyof typeof icons;

export type TocItem = {
  title: string;
  href: string;
  icon: TocIconName;
  children?: { title: string; href: string }[];
};

const SPY_OFFSET = 96; // sticky top bar + breathing room

export function PanelBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-7">
      <p className="mb-2 text-[11px] text-white/35">{label}</p>
      {children}
    </div>
  );
}

export function TocPanel({
  items,
  children,
}: {
  items: TocItem[];
  children?: ReactNode;
}) {
  const ids = items
    .flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])])
    .map((h) => h.slice(1));

  const [activeId, setActiveId] = useState<string>(ids[0]);
  // Set by a click so the item you chose stays highlighted even when two
  // sections share the same scroll position (e.g. side-by-side cards).
  const forced = useRef<string | null>(null);

  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const update = () => {
      let current = els[0].id;
      let currentTop = -Infinity;

      // Last section whose top has passed the offset. On a tie (same top),
      // the first one in document order wins.
      for (const el of els) {
        const top = el.getBoundingClientRect().top - SPY_OFFSET;
        if (top <= 0 && top > currentTop + 2) {
          current = el.id;
          currentTop = top;
        }
      }

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) current = els[els.length - 1].id;

      // Keep a clicked item active while it's still on screen.
      if (forced.current) {
        const el = document.getElementById(forced.current);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.bottom > SPY_OFFSET && r.top < window.innerHeight * 0.7) {
            current = forced.current;
          } else {
            forced.current = null;
          }
        }
      }

      setActiveId(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (id: string) => {
    forced.current = id;
    setActiveId(id);
  };

  return (
    <aside className="sticky top-11 hidden h-[calc(100vh-2.75rem)] self-start overflow-y-auto border-l border-white/[0.06] px-5 py-8 lg:block">
      <p className="mb-2 text-[11px] text-white/35">On this page</p>

      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const id = item.href.slice(1);
          const isActive = activeId === id;
          const childActive = item.children?.some(
            (c) => c.href.slice(1) === activeId,
          );

          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={isActive ? "location" : undefined}
                onClick={() => select(id)}
                className={`flex items-center gap-2.5 rounded px-1.5 py-1.5 text-xs transition ${
                  isActive
                    ? "bg-white/[0.07] text-white"
                    : childActive
                      ? "text-white/90"
                      : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon
                  className={`size-3.5 shrink-0 transition ${
                    isActive || childActive ? "text-blue-300" : "text-white/40"
                  }`}
                />
                {item.title}
              </a>

              {item.children && (
                <ul className="ml-[19px] border-l border-white/[0.07] pl-3">
                  {item.children.map((c) => {
                    const cid = c.href.slice(1);
                    const on = activeId === cid;
                    return (
                      <li key={c.href}>
                        <a
                          href={c.href}
                          aria-current={on ? "location" : undefined}
                          onClick={() => select(cid)}
                          className={`-ml-[13px] block border-l py-1 pl-3 text-[11px] transition ${
                            on
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

      {children}
    </aside>
  );
}
