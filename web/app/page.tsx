"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import Nav from "@/components/interface/nav";
import { EditorContext } from "@/components/providers/editor-context-provider";
import Voice from "@/components/tools/voice";
import ViewDisplayArea from "@/components/views/file-view-display-area";
import { useContext } from "react";

export default function HomePage() {
  const editorContext = useContext(EditorContext);

  return (
    <Nav>
      <div className="flex h-full w-full flex-col">
        <EditorToolbar />
        <ViewDisplayArea />

        {editorContext?.editorStates.isRecording && <Voice />}
      </div>
    </Nav>
  );
}
