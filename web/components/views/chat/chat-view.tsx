"use client";

import AgentChat from "@/components/agent-chat/agent-chat";

export default function ChatView() {
  return (
    <div className="relative flex h-full w-full min-w-0 overflow-hidden">
      {/* Chat column — hidden on small screens when a panel is open */}
      <div
        className="flex h-full min-w-0 flex-1 flex-col"
      >
        <AgentChat variant="page" />
      </div>
    </div>
  );
}
