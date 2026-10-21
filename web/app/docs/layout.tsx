"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/docs/app-sidebar";
import DocsNavbar from "@/components/docs/docs-navbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full flex-col bg-black text-white">
        <DocsNavbar />

        <div className="flex min-h-0 flex-1">
          <AppSidebar collapsible="icon" />

          <SidebarInset className="min-w-0 flex-1 bg-transparent">
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
