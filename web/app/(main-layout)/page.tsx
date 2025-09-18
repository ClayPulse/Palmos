"use client";

import CommandViewer from "@/components/interface/command-viewer";
import EditorToolbar from "@/components/interface/editor-toolbar";
import ExtensionSuggestionOverlay from "@/components/interface/extension-suggestion-overlay";
import Voice from "@/components/tools/voice";
import ConsolePanelView from "@/components/views/console-panel/console-panel-view";
import ViewArea from "@/components/views/view-area";

export default function HomePage() {
  return (
    <div className="relative flex h-full w-full flex-col">
      <EditorToolbar />
      <ViewArea />
      <ConsolePanelView />

      <Voice />
      {false && <ExtensionSuggestionOverlay />}
      <CommandViewer />
    </div>
  );
}
