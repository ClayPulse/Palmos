import CommandViewer from "@/components/interface/command-viewer";
import EditorToolbar from "@/components/interface/editor-toolbar";
import ConsolePanelView from "@/components/views/console-panel/console-panel-view";
import ViewArea from "@/components/views/view-area";



export default function HomePage() {
  return (
    <div className="relative h-full w-full">
      <EditorToolbar />
      <ViewArea />
      <ConsolePanelView />
      <CommandViewer />
    </div>
  );
}
