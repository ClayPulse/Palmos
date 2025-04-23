"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import { EditorContext } from "@/components/providers/editor-context-provider";
import Voice from "@/components/tools/voice";
import ViewDisplayArea from "@/components/views/file-view-display-area";
import { useContext } from "react";

export default function Home() {
  const editorContext = useContext(EditorContext);

  return (
    <div className="flex h-full w-full flex-col">
      <EditorToolbar />
      <ViewDisplayArea />

      {editorContext?.editorStates.isRecording && <Voice />}
    </div>
  );
}
