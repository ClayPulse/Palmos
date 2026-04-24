"use client";

import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import ChatView from "@/components/views/chat/chat-view";
import EditorView from "@/components/views/editor/editor-view";
import HomeView from "@/components/views/home/home-view";
import { AppModeEnum } from "@/lib/enums";
import useRouter from "@/lib/hooks/use-router";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

export default function HomePage() {
  const editorContext = useContext(EditorContext);
  const appMode = editorContext?.editorStates.appMode ?? AppModeEnum.Home;
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const { messages, handleSwitchSession, submit } = useChatContext();
  const importedRef = useRef(false);

  // If there are existing messages, auto-switch to agent mode
  useEffect(() => {
    if (messages.length > 0 && appMode === AppModeEnum.Home) {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        appMode: AppModeEnum.Agent,
      }));
    }
  }, [messages.length, appMode, editorContext]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "home" || mode === "agent" || mode === "editor") {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        appMode:
          mode === "editor"
            ? AppModeEnum.Editor
            : mode === "agent"
              ? AppModeEnum.Agent
              : AppModeEnum.Home,
      }));
      const params = new URLSearchParams(searchParams.toString());
      params.delete("mode");
      const newUrl =
        params.size > 0 ? `?${params.toString()}` : window.location.pathname;
      replace(newUrl);
    }
  }, []);

  // Load shared chat session when ?sharedChat=TOKEN is present
  useEffect(() => {
    const token = searchParams.get("sharedChat");
    if (!token || importedRef.current) return;
    importedRef.current = true;

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Agent,
    }));

    (async () => {
      try {
        const res = await fetchAPI(`/api/chat/share/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.error || data.expired || !data.sessionId) return;
        await handleSwitchSession(data.sessionId, {
          shareToken: token,
          permission: data.permission ?? "read",
        });
      } finally {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("sharedChat");
        const newUrl =
          params.size > 0 ? `?${params.toString()}` : window.location.pathname;
        replace(newUrl);
      }
    })();
  }, [searchParams]);

  const [editorMounted, setEditorMounted] = useState(
    appMode === AppModeEnum.Editor,
  );

  useEffect(() => {
    if (appMode === AppModeEnum.Editor) setEditorMounted(true);
  }, [appMode]);

  const switchToAgent = useCallback(() => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Agent,
    }));
  }, [editorContext]);

  const handleSelectTemplate = useCallback(
    (prompt: string) => {
      switchToAgent();
      setTimeout(() => {
        submit(prompt);
      }, 100);
    },
    [switchToAgent, submit],
  );

  return (
    <>
      {appMode === AppModeEnum.Home && (
        <div className="h-full w-full">
          <HomeView onSelectTemplate={handleSelectTemplate} />
        </div>
      )}

      <div
        className={appMode === AppModeEnum.Agent ? "h-full w-full" : "hidden"}
      >
        <ChatView />
      </div>

      {editorMounted && (
        <div
          className={
            appMode === AppModeEnum.Editor ? "h-full w-full" : "hidden"
          }
        >
          <EditorView />
        </div>
      )}
    </>
  );
}
