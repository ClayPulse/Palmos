"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import ExtensionSuggestionOverlay from "@/components/interface/extension-suggestion-overlay";
import Voice from "@/components/tools/voice";
import ViewDisplayArea from "@/components/views/file-view-display-area";

export default function HomePage() {
  return (
    <div className="flex h-full w-full flex-col">
      <EditorToolbar />
      <ViewDisplayArea />

      <Voice />
      {false && <ExtensionSuggestionOverlay />}
    </div>
  );
}
