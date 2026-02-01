"use client";

import { PlatformEnum } from "@/lib/enums";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useTranslations } from "@/lib/hooks/use-translations";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { createAppViewId } from "@/lib/views/view-helpers";
import { Browser } from "@capacitor/browser";
import { Button } from "@heroui/react";
import { useContext } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import BaseAppView from "../views/base/base-app-view";
import ModalWrapper from "./wrapper";

export default function ArtifactModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { getTranslations } = useTranslations();
  const editorContext = useContext(EditorContext);

  const artifact = editorContext?.editorStates.modalStates?.artifact?.artifact;

  const fromViewId =
    editorContext?.editorStates.modalStates?.artifact?.fromViewId;

  const viewId = artifact ? createAppViewId(artifact.data.appId) : undefined;

  const { createAppViewInCanvasView } = useTabViewManager();

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={getTranslations("artifactModal.title")}
    >
      {artifact && viewId && fromViewId ? (
        <div className="flex h-full w-full flex-col items-center gap-y-2">
          <div className="border-divider h-[300px] w-full overflow-hidden rounded-md border">
            <BaseAppView
              viewId={viewId}
              config={{
                app: artifact.data.appId,
                viewId,
              }}
            />
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              onPress={async () => {
                editorContext?.editorStates.updateWorkflowNodeData?.(
                  fromViewId,
                  {
                    isFullscreen: false,
                  },
                );
                editorContext.updateModalStates({
                  artifact: {
                    isOpen: false,
                  },
                });
                await createAppViewInCanvasView({
                  app: artifact.data.appId,
                  requiredVersion: artifact.data.version,
                  viewId: viewId,
                });
              }}
              color="primary"
            >
              {getTranslations("artifactModal.openInCanvas")}
            </Button>

            <Button
              onPress={() => {
                const url = new URL(
                  window.location.origin + "/?app=" + artifact.data.appId,
                );
                if (getPlatform() === PlatformEnum.Capacitor) {
                  Browser.open({
                    url: url.toString(),
                  });
                } else {
                  // open in a new external browser window
                  window.open(url.toString(), "_blank");
                }
              }}
            >
              {getTranslations("artifactModal.openInNewTab")}
            </Button>
            <Button
              onPress={() => {
                if (!artifact.data.sourceUrl) {
                  return;
                }

                const url = new URL(artifact.data.sourceUrl);
                if (getPlatform() === PlatformEnum.Capacitor) {
                  Browser.open({
                    url: url.toString(),
                  });
                } else {
                  // open in a new external browser window
                  window.open(url.toString(), "_blank");
                }
              }}
            >
              {getTranslations("artifactModal.downloadSource")}
            </Button>
            <Button isDisabled>{getTranslations("artifactModal.editCode")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
          <p className="text-center text-lg font-semibold">
            {getTranslations("artifactModal.noData")}
          </p>
        </div>
      )}
    </ModalWrapper>
  );
}
