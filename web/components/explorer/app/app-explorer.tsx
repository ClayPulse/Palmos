import AppPreviewCard from "@/components/marketplace/app/app-preview-card";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { DragEventTypeEnum } from "@/lib/enums";
import { useScreenSize } from "@/lib/hooks/use-screen-size";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppDragData, AppViewConfig } from "@/lib/types";
import { Button } from "@heroui/react";
import { useContext } from "react";
import { v4 } from "uuid";

export default function AppExplorer() {
  const editorContext = useContext(EditorContext);

  const { createAppViewInCanvasView } = useTabViewManager();
  const { isLandscape } = useScreenSize();

  const extensions = editorContext?.persistSettings?.extensions ?? [];

  const previews = extensions.map((ext, index) => (
    <div
      key={index}
      className="w-full h-fit"
      draggable
      onDragStart={(e) => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isDraggingOverCanvas: true,
        }));
        e.dataTransfer.setData(
          `application/${DragEventTypeEnum.App.toLowerCase()}`,
          JSON.stringify({
            app: ext,
          } as AppDragData),
        );
      }}
      onDragEnd={() => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isDraggingOverCanvas: false,
        }));
      }}
    >
      <AppPreviewCard
        extension={ext}
        isShowInstalledChip={false}
        isShowUninstallButton={false}
        isShowUseButton
        isShowCompatibleChip={false}
        onPress={(ext) => {
          const config: AppViewConfig = {
            app: ext.config.id,
            viewId: `${ext.config.id}-${v4()}`,
            recommendedHeight: ext.config.recommendedHeight,
            recommendedWidth: ext.config.recommendedWidth,
          };
          createAppViewInCanvasView(config);
          console.log("Is Landscape:", isLandscape);
          if (!isLandscape) {
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isSideMenuOpen: false,
            }));
          }
        }}
      />
    </div>
  ));

  return (
    <div className="h-full grid grid-rows-[max-content_auto_max-content] gap-y-2">
      <p className="text-center">Tap or drag an extension to open it.</p>

      <div className="grid grid-cols-2 gap-2 h-full w-full overflow-y-auto overflow-x-hidden px-4">
        {previews}
      </div>
      <div className="flex flex-col gap-y-1 px-4 pb-2">
        <Button
          color="secondary"
          onPress={() => {
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isMarketplaceOpen: true,
            }));
          }}
        >
          Explorer Community Workflows/Apps
        </Button>
      </div>
    </div>
  );
}
