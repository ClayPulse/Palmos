import AppPreviewCard from "@/components/cards/app-preview-card";
import { DraggableItem } from "@/components/misc/draggable-item";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { isMobile } from "@/lib/platform-api/platform-checker";
import {
  AppDragData,
  AppViewConfig,
  DragData,
  ExtensionApp,
} from "@/lib/types";
import { createAppViewId } from "@/lib/views/view-helpers";
import { useDraggable } from "@dnd-kit/core";
import { Button } from "@heroui/react";
import { useContext, useEffect, useState } from "react";

export default function AppExplorer() {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);

  const { installedExtensionApps } = useExtensionAppManager();

  const previews = installedExtensionApps.map((ext, index) => (
    <DraggableAppPreviewCard key={index} ext={ext} />
  ));

  return (
    <div className="grid h-full grid-rows-[max-content_auto_max-content] gap-y-2">
      <p className="text-center">{t("appExplorer.dragTip")}</p>

      <div className="grid h-fit max-h-full w-full grid-cols-2 gap-2 overflow-x-hidden overflow-y-auto px-4">
        {previews}
      </div>
      <div className="flex flex-col gap-y-1 px-4 pb-2">
        <Button
          color="secondary"
          onPress={() => {
            editorContext?.updateModalStates({ marketplace: { isOpen: true } });
          }}
        >
          {t("appExplorer.exploreWorkflowsApps")}
        </Button>
      </div>
    </div>
  );
}

function DraggableAppPreviewCard({ ext }: { ext: ExtensionApp }) {
  const editorContext = useContext(EditorContext);

  const { createAppViewInCanvasView } = useTabViewManager();
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `draggable-app-${ext.config.id}`,
    data: {
      type: "app",
      data: {
        app: ext,
      } as AppDragData,
    } as DragData,
  });

  const [isDragFinished, setIsDragFinished] = useState(false);

  useEffect(() => {
    if (isDragging) {
      setIsDragFinished(false);
    } else {
      // Delay 200ms and then set isDragFinished to true,
      // so the app preview button is not triggered via a press event.
      setTimeout(() => {
        setIsDragFinished(true);
      }, 200);
    }
  }, [isDragging]);

  return (
    <DraggableItem
      className="h-fit w-full"
      ref={setNodeRef}
      listeners={listeners}
    >
      <AppPreviewCard
        extension={ext}
        isShowInstalledChip={false}
        isShowUninstallButton={false}
        isShowUseButton
        isShowCompatibleChip={false}
        isShowContextMenu={false}
        isDisableButtonPress={!isDragFinished}
        onPress={async (ext) => {
          if (isMobile()) {
            // On mobile, close the explorer after opening the app.
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isSideMenuOpen: false,
            }));
          }
          const config: AppViewConfig = {
            app: ext.config.id,
            viewId: createAppViewId(ext.config.id),
            initialHeight: ext.config.recommendedHeight,
            initialWidth: ext.config.recommendedWidth,
          };
          await createAppViewInCanvasView(config);
        }}
        listeners={listeners}
      />
    </DraggableItem>
  );
}
