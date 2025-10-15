"use client";

import { IMCContext } from "@/components/providers/imc-provider";
import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { TreeViewGroupRef } from "@/lib/types";
import { addToast, Button } from "@heroui/react";
import { IMCMessageTypeEnum, ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Icon from "../../misc/icon";
import { EditorContext } from "../../providers/editor-context-provider";
import TreeViewGroup from "./tree-view";

export default function FileSystemExplorer({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const platform = getPlatform();
  const { platformApi } = usePlatformApi();
  const { activeTabView, closeAllTabViews } = useTabViewManager();

  const rootGroupRef = useRef<TreeViewGroupRef | null>(null);

  // Reset root group ref when there are other nodes selected
  useEffect(() => {
    const selectedNodes =
      editorContext?.editorStates.explorerSelectedNodeRefs ?? [];

    if (selectedNodes.length > 0) {
      rootGroupRef.current?.cancelCreating();
    }
  }, [editorContext?.editorStates.explorerSelectedNodeRefs]);

  async function viewFile(uri: string) {
    // Simply send uri to selected app node or app view
    if (activeTabView?.type === ViewModeEnum.App) {
      // Send uri to app view
      await imcContext?.polyIMC?.sendMessage(
        activeTabView.config.viewId,
        IMCMessageTypeEnum.EditorAppReceiveFileUri,
        {
          uri,
        },
      );

      if (platform === PlatformEnum.Capacitor) {
        setIsMenuOpen(false);
      }
    } else if (activeTabView?.type === ViewModeEnum.Canvas) {
      // Get selected node and send to that node
      const selectedViewIds = editorContext?.editorStates.selectedViewIds ?? [];

      if (selectedViewIds.length === 0) {
        addToast({
          title: "No app selected to handle this file.",
          description: "Please select a node in canvas to view the file",
          color: "danger",
        });
        return;
      }

      // For each selected view Id, send selected file uri
      for (const viewId of selectedViewIds) {
        await imcContext?.polyIMC?.sendMessage(
          viewId,
          IMCMessageTypeEnum.EditorAppReceiveFileUri,
          {
            uri,
          },
        );
      }

      if (platform === PlatformEnum.Capacitor) {
        setIsMenuOpen(false);
      }
    } else {
      addToast({
        title: "No app selected or opened to handle this file.",
        description:
          "Please open an app or select a node in canvas to view the file",
        color: "danger",
      });
    }
  }

  function startCreatingNewFolder() {
    const selectedNodes =
      editorContext?.editorStates.explorerSelectedNodeRefs ?? [];

    // Use the outer most selected tree view group
    if (selectedNodes.length === 0) {
      rootGroupRef.current?.startCreatingNewFolder();
      return;
    } else if (selectedNodes.length === 1) {
      const node = selectedNodes[0].current;

      if (node?.isFolder()) {
        const childGroup = node?.getChildGroupRef();
        childGroup?.startCreatingNewFolder();
        return;
      }

      // If the selected node is a file, create a new folder in the same folder
      const parentGroup = node?.getParentGroupRef();
      parentGroup?.startCreatingNewFolder();
      return;
    }

    toast.error("Please select only one folder to create a new folder inside.");
    return;
  }

  function startCreatingNewFile() {
    const selectedNodes =
      editorContext?.editorStates.explorerSelectedNodeRefs ?? [];

    // Use the outer most selected tree view group
    if (selectedNodes.length === 0) {
      rootGroupRef.current?.startCreatingNewFile();
      return;
    } else if (selectedNodes.length === 1) {
      const node = selectedNodes[0].current;

      if (node?.isFolder()) {
        const childGroup = node?.getChildGroupRef();
        childGroup?.startCreatingNewFile();
        return;
      }

      // If the selected node is a file, create a new file in the same folder
      const parentGroup = node?.getParentGroupRef();
      parentGroup?.startCreatingNewFile();
      return;
    }

    toast.error("Please select only one folder to create a new file inside.");
    return;
  }

  // Browse inside a project
  return (
    <div className="relative h-full w-full px-2 py-1">
      <div className="flex h-full w-full flex-col space-y-2">
        <div className="bg-default text-default-foreground flex h-10 w-full items-center rounded-xl px-3">
          <div className="flex w-full">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={startCreatingNewFolder}
            >
              <Icon name="create_new_folder" variant="outlined" />
            </Button>
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={startCreatingNewFile}
            >
              <Icon
                uri="/icons/add-file"
                className="-translate-x-0.5"
                isThemed
              />
            </Button>
          </div>
          <div className="flex">
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => {
                editorContext?.setEditorStates((prev) => {
                  return {
                    ...prev,
                    project: "",
                    projectContent: [],
                  };
                });

                // Clear view manager
                closeAllTabViews();
              }}
            >
              <Icon name="close" variant="outlined" />
            </Button>
            {/* <Button isIconOnly variant="light" size="sm">
              <Icon name="cloud_upload" variant="outlined" />
            </Button>
            <Button isIconOnly variant="light" size="sm">
              <Icon name="cloud_download" variant="outlined" />
            </Button>
            <Button isIconOnly variant="light" size="sm">
              <Icon name="search" variant="outlined" />
            </Button> */}
          </div>
        </div>

        {editorContext?.editorStates.projectContent?.length === 0 && (
          <div className="pointer-events-none absolute top-0 left-0 m-0 flex h-full w-full flex-col items-center justify-center px-2 pb-16">
            <p className="text-center">
              Empty content. Create a new file to get started.
            </p>
          </div>
        )}

        <div className="overflow-y-auto">
          <TreeViewGroup
            ref={rootGroupRef}
            objects={editorContext?.editorStates.projectContent ?? []}
            viewFile={viewFile}
            folderUri={
              editorContext?.persistSettings?.projectHomePath +
              "/" +
              editorContext?.editorStates.project
            }
            platformApi={platformApi}
          />
        </div>
      </div>
    </div>
  );
}
