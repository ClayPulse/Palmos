"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import ExtensionSuggestionOverlay from "@/components/interface/extension-suggestion-overlay";
import Voice from "@/components/tools/voice";
import CanvasView from "@/components/views/canvas-view";

export default function HomePage() {
  return (
    <div className="flex h-full w-full flex-col">
      <EditorToolbar />
      <CanvasView />

      <Voice />
      {false && <ExtensionSuggestionOverlay />}
    </div>
  );
}
