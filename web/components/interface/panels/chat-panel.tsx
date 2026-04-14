"use client";
"use client";

import AgentChat from "@/components/agent-chat/agent-interface";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext } from "react";
import BaseSidePanel from "./base-side-panel";

export default function ChatPanel() {
  const editorContext = useContext(EditorContext);
  const isOpen = editorContext?.editorStates.isChatPanelOpen ?? false;

  return (
    <BaseSidePanel isOpen={isOpen} direction="right">
      <div className="h-full w-full overflow-hidden min-[768px]:py-2 min-[768px]:pr-2 min-[768px]:pl-1">
        <AgentChat
          variant="panel"
          onClose={() =>
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isChatPanelOpen: false,
            }))
          }
        />
      </div>
    </BaseSidePanel>
  );
}
