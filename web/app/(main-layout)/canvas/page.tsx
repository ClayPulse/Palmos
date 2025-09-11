"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import ExtensionSuggestionOverlay from "@/components/interface/extension-suggestion-overlay";
import Voice from "@/components/tools/voice";
import CanvasView from "@/components/views/canvas-view";
import ConsolePanelView from "@/components/views/console-panel-view";

export default function HomePage() {
  return (
    <div className="relative flex h-full w-full flex-col">
      <EditorToolbar />
      <CanvasView />
      <ConsolePanelView />

      <Voice />
      {false && <ExtensionSuggestionOverlay />}
    </div>
  );
}
