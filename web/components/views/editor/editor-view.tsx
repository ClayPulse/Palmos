"use client";

import CommandViewer from "@/components/interface/command-viewer";
import EditorToolbar from "@/components/interface/editor-toolbar";
import ConsolePanelView from "@/components/views/editor/console-panel/console-panel-view";
import ViewArea from "@/components/views/editor/view-area";

export default function EditorView() {
  return (
    <div className="relative h-full w-full">
      <EditorToolbar />
      <ViewArea />
      <ConsolePanelView />
      <CommandViewer />
    </div>
  );
}
