"use client";

import { EditorContext } from "@/components/providers/editor-context-provider";
import ChatView from "@/components/views/chat/chat-view";
import EditorView from "@/components/views/editor/editor-view";
import { useContext } from "react";

export default function HomePage() {
  const editorContext = useContext(EditorContext);
  const appMode = editorContext?.editorStates.appMode ?? "ai";

  if (appMode === "ai") {
    return <ChatView />;
  }

  return <EditorView />;
}
