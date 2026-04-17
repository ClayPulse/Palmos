"use client";

import AgentChat from "@/components/agent-chat/agent-chat";

export default function ChatView() {
  return (
    <div className="relative flex h-full w-full min-w-0 overflow-hidden">
      {/* Chat column — hidden on small screens when a panel is open */}
      <div
        className={`flex h-full min-w-0 flex-col ${"hidden md:flex md:w-1/2 lg:w-2/5"}`}
      >
        <AgentChat variant="page" />
      </div>
    </div>
  );
}
