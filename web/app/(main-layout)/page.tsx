"use client";

import { EditorContext } from "@/components/providers/editor-context-provider";
import ChatView from "@/components/views/chat/chat-view";
import EditorView from "@/components/views/editor/editor-view";
import { AppModeEnum } from "@/lib/enums";
import useRouter from "@/lib/hooks/use-router";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect } from "react";

export default function HomePage() {
  const editorContext = useContext(EditorContext);
  const appMode = editorContext?.editorStates.appMode ?? AppModeEnum.Agent;
  const searchParams = useSearchParams();
  const { replace } = useRouter();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "agent" || mode === "editor") {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        appMode: mode === "agent" ? AppModeEnum.Agent : AppModeEnum.Editor,
      }));
      // Remove the param from the URL without adding a history entry
      const params = new URLSearchParams(searchParams.toString());
      params.delete("mode");
      const newUrl =
        params.size > 0 ? `?${params.toString()}` : window.location.pathname;
      replace(newUrl);
    }
  }, []);

  if (appMode === AppModeEnum.Agent) {
    return <ChatView />;
  }

  return <EditorView />;
}
