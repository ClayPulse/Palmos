"use client";

import AIChatInterface from "@/components/chat/ai-chat-interface";
import ChatEmbedPanel, {
  EmbedPanelTab,
} from "@/components/chat/chat-embed-panel";
import Icon from "@/components/misc/icon";
import { useState } from "react";

const EMBED_BUTTONS: { tab: EmbedPanelTab; icon: string; label: string }[] = [
  { tab: "a2ui", icon: "language", label: "A2UI" },
  { tab: "mcp-apps", icon: "hub", label: "MCP Apps" },
  { tab: "pulse-app", icon: "apps", label: "Pulse App" },
  { tab: "workflow-canvas", icon: "account_tree", label: "Canvas" },
];

export default function ChatView() {
  const [activePanel, setActivePanel] = useState<EmbedPanelTab | null>(null);

  function togglePanel(tab: EmbedPanelTab) {
    setActivePanel((prev) => (prev === tab ? null : tab));
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Chat column — hidden on small screens when a panel is open */}
      <div
        className={`flex h-full flex-col ${
          activePanel ? "hidden md:flex md:w-1/2 lg:w-2/5" : "flex-1"
        }`}
      >
        <AIChatInterface variant="page" />
      </div>

      {/* Embed panel toggle buttons — shown only when no panel is open */}
      {!activePanel && (
        <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2">
          {EMBED_BUTTONS.map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => togglePanel(tab)}
              title={label}
              className="flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50 hover:shadow-[0_0_10px_rgba(245,158,11,0.18)] dark:border-amber-500/35 dark:bg-white/6 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-white/10"
            >
              <Icon name={icon} variant="round" className="text-sm" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Embed display panel */}
      {activePanel && (
        <div className="flex h-full flex-1 md:w-1/2 lg:w-3/5">
          <ChatEmbedPanel
            activeTab={activePanel}
            onTabChange={setActivePanel}
            onClose={() => setActivePanel(null)}
          />
        </div>
      )}
    </div>
  );
}

