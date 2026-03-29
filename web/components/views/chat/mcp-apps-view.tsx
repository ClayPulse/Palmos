"use client";

import Icon from "@/components/misc/icon";
import { useRef, useState } from "react";

const MCP_URL = "https://modelcontextprotocol.io/extensions/apps/overview";

const FEATURE_BULLETS = [
  { icon: "extension", text: "Discover community-built MCP server integrations" },
  { icon: "storage", text: "Connect to databases, APIs, and local tools via MCP" },
  { icon: "code", text: "Open protocol — works with any MCP-compatible host" },
  { icon: "rocket_launch", text: "Install in one click with supported MCP clients" },
];

const QUICK_LINKS: { label: string; href: string; icon: string }[] = [
  { label: "Overview", href: MCP_URL, icon: "grid_view" },
  { label: "Docs", href: "https://modelcontextprotocol.io/docs", icon: "menu_book" },
  { label: "GitHub", href: "https://github.com/modelcontextprotocol", icon: "code" },
];

export default function MCPAppsView() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  function handleIframeLoad() {
    setIframeLoading(false);
    // Detect X-Frame-Options / CSP frame-ancestors blocking:
    // If the iframe was blocked, the browser shows a same-origin error page and
    // we can read contentDocument. If the page loaded successfully (cross-origin),
    // accessing contentDocument throws a SecurityError.
    try {
      const href = iframeRef.current?.contentDocument?.location?.href;
      if (href !== undefined) {
        // Same-origin access succeeded → the target URL was blocked; show fallback
        setIframeError(true);
      }
    } catch {
      // SecurityError: cross-origin content loaded fine, nothing to do
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-[#0d0d14]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-amber-200/60 bg-white px-4 py-3 dark:border-white/8 dark:bg-white/3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
          <Icon name="hub" variant="round" className="text-base text-amber-600 dark:text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">MCP Apps</h2>
          <p className="truncate text-xs text-gray-500 dark:text-white/50">
            Model Context Protocol — browse server integrations
          </p>
        </div>
        <a
          href={MCP_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in browser"
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-white/40 dark:hover:bg-white/6 dark:hover:text-white/70"
        >
          <Icon name="open_in_new" variant="round" className="text-base" />
        </a>
      </div>

      {/* Main content: iframe with loading/error overlay */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Loading spinner */}
        {iframeLoading && !iframeError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-[#0d0d14]">
            <div className="flex h-12 w-12 animate-spin items-center justify-center rounded-full border-2 border-amber-200 border-t-amber-500 dark:border-white/10 dark:border-t-amber-400" />
            <p className="text-xs text-gray-500 dark:text-white/50">Loading MCP Apps…</p>
          </div>
        )}

        {/* Fallback when iframe is blocked */}
        {iframeError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-gray-50 px-6 py-10 dark:bg-[#0d0d14]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
              <Icon name="hub" variant="round" className="text-2xl text-amber-600 dark:text-amber-300" />
            </div>
            <div className="text-center">
              <h3 className="mb-1 text-sm font-bold text-gray-800 dark:text-white/85">MCP Apps</h3>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Discover and install Model Context Protocol server integrations for AI-powered workflows.
              </p>
            </div>

            <ul className="w-full max-w-xs space-y-2">
              {FEATURE_BULLETS.map(({ icon, text }) => (
                <li key={icon} className="flex items-start gap-2 text-xs text-gray-600 dark:text-white/60">
                  <Icon name={icon} variant="round" className="mt-0.5 shrink-0 text-sm text-amber-500/80 dark:text-amber-400/70" />
                  {text}
                </li>
              ))}
            </ul>

            {/* Quick links */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_LINKS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-amber-300/60 bg-white px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50 hover:shadow-[0_0_10px_rgba(245,158,11,0.18)] dark:border-amber-500/35 dark:bg-white/6 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-white/10"
                >
                  <Icon name={icon} variant="round" className="text-sm" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* sandbox intentionally omits allow-same-origin to keep the sandbox effective */}
        <iframe
          ref={iframeRef}
          src={MCP_URL}
          className={`h-full w-full border-none transition-opacity duration-300 ${iframeLoading || iframeError ? "opacity-0" : "opacity-100"}`}
          title="MCP Apps"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
