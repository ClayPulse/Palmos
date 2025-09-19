"use client";

import CommandViewer from "@/components/interface/command-viewer";
import EditorToolbar from "@/components/interface/editor-toolbar";
import ExtensionSuggestionOverlay from "@/components/interface/extension-suggestion-overlay";
import { EditorContext } from "@/components/providers/editor-context-provider";
import Voice from "@/components/tools/voice";
import ConsolePanelView from "@/components/views/console-panel/console-panel-view";
import ViewArea from "@/components/views/view-area";
import { useContext } from "react";

export default function HomePage() {
  const editorContext = useContext(EditorContext);

  return (
    <div className="relative flex h-full w-full flex-col">
      <EditorToolbar />
      <ViewArea />
      <ConsolePanelView />

      <Voice />
      {false && <ExtensionSuggestionOverlay />}
      {editorContext?.editorStates.isCommandViewerOpen && <CommandViewer />}
    </div>
  );
}
