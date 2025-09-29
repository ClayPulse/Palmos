import ExtensionPreview from "@/components/extension/extension-preview";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { AppViewConfig } from "@/lib/types";
import { Button } from "@heroui/react";
import { useContext } from "react";
import { v4 } from "uuid";

export default function AppExplorer() {
  const editorContext = useContext(EditorContext);

  const { createAppViewInCanvasView } = useTabViewManager();

  const extensions = editorContext?.persistSettings?.extensions ?? [];

  const previews = extensions.map((ext, index) => (
    <div
      key={index}
      className="w-full h-fit"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(ext));
      }}
    >
      <ExtensionPreview
        extension={ext}
        isShowInstalledChip={false}
        isShowUninstallButton={false}
        isShowUseButton
        isShowCompatibleChip={false}
        onPress={(ext) => {
          const config: AppViewConfig = {
            app: ext.config.id,
            viewId: v4(),
            recommendedHeight: ext.config.recommendedHeight,
            recommendedWidth: ext.config.recommendedWidth,
          };
          createAppViewInCanvasView(config);
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
      <Button
        className="mx-4 mb-2"
        onPress={() => {
          editorContext?.setEditorStates((prev) => ({
            ...prev,
            isMarketplaceOpen: true,
          }));
        }}
      >
        Browse More Apps
      </Button>
    </div>
  );
}
