"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import Nav from "@/components/interface/nav";
import Voice from "@/components/tools/voice";
import ViewDisplayArea from "@/components/views/file-view-display-area";

export default function HomePage() {
  return (
    <Nav>
      <div className="flex h-full w-full flex-col">
        <EditorToolbar />
        <ViewDisplayArea />

        <Voice />
      </div>
    </Nav>
  );
}
