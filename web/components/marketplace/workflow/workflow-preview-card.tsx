import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { ContextMenuState, Workflow } from "@/lib/types";
import { Button, Skeleton } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import { v4 } from "uuid";
import ContextMenu from "../../interface/context-menu";

export default function WorkflowPreviewCard({
  workflow,
  isPressable = true,
}: {
  workflow: Workflow;
  isPressable?: boolean;
}) {
  const editorContext = useContext(EditorContext);

  const { createCanvasTabView } = useTabViewManager();

  const [isLoaded, setIsLoaded] = useState(false);

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  const [isShowInfo, setIsShowInfo] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, [workflow]);

  if (!isLoaded) {
    return <Skeleton className="h-full w-full" />;
  }

  async function openWorkflow() {
    await createCanvasTabView({
      viewId: `canvas-${v4()}`,
      appConfigs: workflow.content.nodes.map((node) => node.data.config),
      initialWorkflowContent: workflow.content,
    });

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isMarketplaceOpen: false,
    }));
  }

  return (
    <div className="w-full h-full grid grid-rows-[auto_max-content_max-content] grid-cols-1">
      <div
        className="relative h-full w-full min-h-32"
        onMouseEnter={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsShowInfo(true);
          }
        }}
        // Hide show info when user taps outside of the modal
        onMouseLeave={() => {
          if (getPlatform() !== PlatformEnum.Capacitor) {
            setIsShowInfo(false);
          }
        }}
      >
        <Button
          className="relative m-0 h-full w-full rounded-md p-0"
          onPress={() => {
            if (isPressable) {
              openWorkflow();
            } else {
              setIsShowInfo((prev) => !prev);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            // Get parent element position
            const current = e.currentTarget as HTMLElement;
            const parent = current.parentElement as HTMLElement;
            const parentRect = parent.getBoundingClientRect();

            setContextMenuState(() => ({
              x: e.clientX - parentRect.left,
              y: e.clientY - parentRect.top,
              isOpen: true,
            }));
          }}
        >
          {workflow.thumbnail ? (
            <img
              src={workflow.thumbnail}
              alt={workflow.name}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <Skeleton className="h-full w-full" isLoaded={false}></Skeleton>
          )}
        </Button>
        {isShowInfo && (
          <div className="absolute bottom-0.5 left-1/2 flex w-full -translate-x-1/2 justify-center gap-x-0.5">
            <Button
              color="primary"
              size="sm"
              onPress={() => {
                openWorkflow();
              }}
            >
              Use
            </Button>

            <Button color="secondary" size="sm">
              Details
            </Button>
          </div>
        )}
        <ContextMenu state={contextMenuState} setState={setContextMenuState}>
          <div className="flex flex-col">
            <Button
              className="text-medium h-12 sm:h-8 sm:text-sm"
              variant="light"
              onPress={(e) => {}}
            >
              <p className="w-full text-start">Use</p>
            </Button>
          </div>
        </ContextMenu>
      </div>
      <p className="text-center break-words">{workflow.name}</p>
      <p className="text-center">{workflow.version}</p>
    </div>
  );
}
