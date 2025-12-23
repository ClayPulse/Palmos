import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useEditorAIAssistantHint } from "@/lib/hooks/use-editor-ai-assistant-hint";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { Button, Input } from "@heroui/react";
import { useCallback, useContext } from "react";
import { v4 } from "uuid";

export default function ProjectView() {
  const editorContext = useContext(EditorContext);

  const { createCanvasTabView } = useTabViewManager();
  const { hint: inputPlaceholder } = useEditorAIAssistantHint();

  const createNewCanvas = useCallback(async () => {
    await createCanvasTabView({
      viewId: "canvas-" + v4(),
    });
  }, []);

  const openMarketplace = useCallback(() => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      modalStates: {
        ...prev.modalStates,
        marketplace: {
          isOpen: true,
        },
      },
    }));
  }, [editorContext]);

  return (
    <div className="text-default-foreground flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12">
      <h1 className="pb-8 text-center text-4xl font-semibold">
        Project Overview
      </h1>
      <div className="flex h-22 flex-col items-center gap-y-1">
        {!editorContext?.editorStates.isCommandViewerOpen && (
          <>
            <p className="text-center text-lg font-normal">
              What's on your mind today?
            </p>
            <Input
              className="sm:w-80"
              onFocus={() => {
                // Open command viewer
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  isCommandViewerOpen: true,
                }));
              }}
              placeholder={inputPlaceholder}
              label="AI Assistant"
              startContent={
                <div>
                  <Icon name="auto_awesome" />
                </div>
              }
            />
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-y-2 sm:flex-row sm:gap-x-2">
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
