"use client";

import Icon from "@/components/misc/icon";

const MCP_DOC_URL = "https://modelcontextprotocol.io";

const FEATURE_BULLETS = [
  { icon: "extension", text: "MCP tools are called by the AI agent during chat" },
  { icon: "storage", text: "Connect to databases, APIs, and local tools via MCP" },
  { icon: "code", text: "Open protocol — works with any MCP-compatible host" },
  { icon: "chat", text: "Tool results render as inline widgets in the conversation" },
];

const QUICK_LINKS: { label: string; href: string; icon: string }[] = [
  { label: "Overview", href: MCP_DOC_URL, icon: "grid_view" },
  { label: "Docs", href: `${MCP_DOC_URL}/docs`, icon: "menu_book" },
  { label: "GitHub", href: "https://github.com/modelcontextprotocol", icon: "code" },
];

export default function MCPAppsView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto bg-gray-50 px-6 py-10 dark:bg-[#0d0d14]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
        <Icon name="hub" variant="round" className="text-2xl text-amber-600 dark:text-amber-300" />
      </div>
      <div className="text-center">
        <h3 className="mb-1 text-sm font-bold text-gray-800 dark:text-white/85">MCP Apps</h3>
        <p className="max-w-xs text-xs text-gray-500 dark:text-white/50">
          MCP tool results appear inline in chat when the AI agent calls MCP servers.
          The agent can use filesystem, terminal, and other MCP integrations.
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

      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_LINKS.map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-amber-300/60 bg-white px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50 dark:border-amber-500/35 dark:bg-white/6 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-white/10"
          >
            <Icon name={icon} variant="round" className="text-sm" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
