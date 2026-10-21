"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  Code2,
  Compass,
  FileText,
  LifeBuoy,
  Blocks,
  Search,
  Settings2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  external?: boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const nav: NavGroup[] = [
  {
    items: [
      { title: "Introduction", href: "/docs", icon: BookOpen },
      { title: "Architecture", href: "/docs/architecture", icon: Blocks },
      {
        title: "Connect an MCP client",
        href: "/docs/connection",
        icon: Compass,
      },
    ],
  },
  {
    label: "Core concepts",
    items: [
      { title: "How ROUTE works", href: "/docs/concepts", icon: Boxes },
      {
        title: "Agent identity",
        href: "/docs/agent-identity",
        icon: ShieldCheck,
      },
      {
        title: "Saved opportunities",
        href: "/docs/saved-opportunities",
        icon: Settings2,
      },
    ],
  },
  {
    label: "Tools reference",
    items: [
      {
        title: "Search opportunities",
        href: "/docs/tools/search-opportunities",
        icon: Search,
      },
      {
        title: "Get opportunity",
        href: "/docs/tools/get-opportunity",
        icon: FileText,
      },
      {
        title: "Prepare opportunity",
        href: "/docs/tools/prepare-opportunity",
        icon: Code2,
      },
      {
        title: "Save opportunity",
        href: "/docs/tools/save-opportunity",
        icon: BookOpen,
      },
      {
        title: "Health check",
        href: "/docs/tools/health-check",
        icon: Zap,
      },
    ],
  },
];

const footerNav: NavItem[] = [
  {
    title: "Report an issue",
    href: "https://github.com",
    icon: LifeBuoy,
    external: true,
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/docs") {
    return pathname === "/docs";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavMenu({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-0.5">
      {items.map((item) => {
        const active = !item.external && isItemActive(pathname, item.href);

        const Icon = item.icon;

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={active}
              tooltip={item.title}
              className="h-8 gap-2 px-2 text-[13px] font-normal text-sidebar-foreground/75 transition-colors hover:text-sidebar-foreground data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
            >
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full flex-row items-center gap-2"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="flex w-full flex-row items-center gap-2"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({
  title = "ROUTE Docs",
  ...props
}: React.ComponentProps<typeof Sidebar> & { title?: string }) {
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-3 py-3">
        <div className="flex h-9 items-center gap-2.5 px-2">
          {/* <Link
            href="/docs"
            className="flex min-w-0 items-center gap-2.5 leading-none"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              R
            </span>

            {state === "expanded" && (
              <span className="truncate text-sm font-semibold tracking-tight">
                {title}
              </span>
            )}
          </Link> */}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="gap-0">
        {nav.map((group, index) => (
          <SidebarGroup
            key={group.label ?? `general-${index}`}
            className="px-3 py-2"
          >
            {group.label && state === "expanded" && (
              <SidebarGroupLabel className="mb-2 h-7 px-2 text-sm font-semibold tracking-wider text-white-foreground/45">
                {group.label}
              </SidebarGroupLabel>
            )}

            <SidebarGroupContent>
              <NavMenu items={group.items} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="px-3 py-3">
        <NavMenu items={footerNav} />

        {state === "expanded" && (
          <div className="px-2 pt-2">
            <p className="text-[11px] leading-5 text-sidebar-foreground/40">
              ROUTE — Opportunity infrastructure for AI agents.
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
