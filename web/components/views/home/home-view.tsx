import { EditorContext } from "@/components/providers/editor-context-provider";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { Button } from "@heroui/react";
import { useCallback, useContext } from "react";
import { v4 } from "uuid";

export default function HomeView() {
  const editorContext = useContext(EditorContext);

  const { createCanvasTabView } = useTabViewManager();

  const createNewCanvas = useCallback(async () => {
    await createCanvasTabView({
      viewId: "canvas-" + v4(),
    });
  }, []);

  const openMarketplace = useCallback(() => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isMarketplaceOpen: true,
    }));
  }, [editorContext]);

  return (
    <div className="text-default-foreground flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12">
      <h1 className="text-center text-2xl font-bold">
        Welcome to Pulse Editor!
      </h1>
      <p className="text-center text-lg font-normal">
        Start by opening a project.
      </p>

      <div className="mt-4 flex gap-x-2">
        <Button color="primary" onPress={createNewCanvas}>
          New Workflow
        </Button>
        <Button color="secondary" onPress={openMarketplace}>
          Discover Apps/Workflows
        </Button>
      </div>
    </div>
  );
}
