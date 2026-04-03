"use client";

import AgentInterface from "@/components/chat/agent-interface";
import ChatEmbedPanel, {
  EmbedPanelTab,
} from "@/components/chat/embed-panel";
import { useState } from "react";

export default function ChatView() {
  const [activePanel, setActivePanel] = useState<EmbedPanelTab | null>(null);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Chat column — hidden on small screens when a panel is open */}
      <div
        className={`flex h-full flex-col ${
          activePanel ? "hidden md:flex md:w-1/2 lg:w-2/5" : "flex-1"
        }`}
      >
        <AgentInterface variant="page" />
      </div>

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
