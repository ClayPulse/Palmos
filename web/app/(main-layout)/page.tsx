"use client";

import { EditorContext } from "@/components/providers/editor-context-provider";
import { useChatContext } from "@/components/providers/chat-provider";
import ChatView from "@/components/views/chat/chat-view";
import EditorView from "@/components/views/editor/editor-view";
import { AppModeEnum } from "@/lib/enums";
import useRouter from "@/lib/hooks/use-router";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";

export default function HomePage() {
  const editorContext = useContext(EditorContext);
  const appMode = editorContext?.editorStates.appMode ?? AppModeEnum.Agent;
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const { importSharedChat } = useChatContext();
  const importedRef = useRef(false);

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

  // Import shared chat when ?sharedChat=TOKEN is present
  useEffect(() => {
    const token = searchParams.get("sharedChat");
    if (!token || importedRef.current) return;
    importedRef.current = true;

    // Switch to agent mode so the chat is visible
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Agent,
    }));

    importSharedChat(token).finally(() => {
      // Remove the param from the URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("sharedChat");
      const newUrl =
        params.size > 0 ? `?${params.toString()}` : window.location.pathname;
      replace(newUrl);
    });
  }, [searchParams]);

  const [editorMounted, setEditorMounted] = useState(appMode === AppModeEnum.Editor);

  useEffect(() => {
    if (appMode === AppModeEnum.Editor) setEditorMounted(true);
  }, [appMode]);

  return (
    <>
      <div className={appMode === AppModeEnum.Agent ? "h-full w-full" : "hidden"}>
        <ChatView />
      </div>
      {editorMounted && (
        <div className={appMode === AppModeEnum.Editor ? "h-full w-full" : "hidden"}>
          <EditorView />
        </div>
      )}
    </>
  );
}
