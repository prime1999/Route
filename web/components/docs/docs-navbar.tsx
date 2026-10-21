"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { SidebarTrigger } from "@/components/ui/sidebar";

const DocsNavbar = () => {
  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center gap-3 border-b border-white/10 px-4 backdrop-blur-3xl sm:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/docs" className="flex items-center gap-2">
          {/* <span className="flex size-7 items-center justify-center rounded-md bg-violet-500 text-sm font-bold text-white">
            R
          </span> */}
          <span className="text-lg font-bold tracking-tight text-white">
            ROUTE
          </span>
          <p className="text-xs ml-2">Version: 2026-10-10</p>
        </Link>
      </div>

      <div className="flex flex-1 justify-end">
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                ctrlKey: true,
                bubbles: true,
              }),
            );
          }}
          className="flex h-8 w-full max-w-[240px] items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white/50 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate text-xs">Search documentation...</span>
          <span className="ml-auto hidden text-xs sm:inline">⌘K</span>
        </button>
      </div>

      <Link
        href="https://github.com/prime1999/Route"
        target="_blank"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <FaGithub className="size-4" />
      </Link>

      <div className="">
        <SidebarTrigger className="size-8 text-white/70 hover:text-white" />
      </div>
    </header>
  );
};

export default DocsNavbar;
