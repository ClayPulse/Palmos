"use client";

import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum, TreeViewGroupRef } from "@/lib/types";
import { Button } from "@heroui/react";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { v4 } from "uuid";
import Icon from "../../misc/icon";
import { EditorContext } from "../../providers/editor-context-provider";
import TreeViewGroup from "./tree-view";

export default function FileSystemExplorer({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  const platform = getPlatform();
  const editorContext = useContext(EditorContext);
  const { platformApi } = usePlatformApi();
  const { openFileInView } = useTabViewManager();

  const rootGroupRef = useRef<TreeViewGroupRef | null>(null);

  // Reset root group ref when there are other nodes selected
  useEffect(() => {
    const selectedNodes =
      editorContext?.editorStates.explorerSelectedNodeRefs ?? [];

    if (selectedNodes.length > 0) {
      rootGroupRef.current?.cancelCreating();
    }
  }, [editorContext?.editorStates.explorerSelectedNodeRefs]);

  function viewFile(uri: string, viewMode: ViewModeEnum) {
    platformApi?.readFile(uri).then((file) => {
      const viewId = v4();
      openFileInView(viewId, file, viewMode).then(() => {
        if (platform === PlatformEnum.Capacitor) {
          setIsMenuOpen(false);
        }
      });
    });
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
    <div className="relative h-full w-full">
      {/* <div className="flex w-full justify-center">
          <div className="w-fit">
            <Tabs
              tabItems={tabItems}
              selectedItem={tabItems[selectedTabIndex]}
              setSelectedItem={(item) => {
                const index = tabItems.findIndex(
                  (tab) => tab.name === item?.name,
                );
                setSelectedTabIndex(index !== -1 ? index : 0);
              }}
              isClosable={false}
            />
          </div>
        </div> */}

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
            <Button isIconOnly variant="light" size="sm">
              <Icon name="cloud_upload" variant="outlined" />
            </Button>
            <Button isIconOnly variant="light" size="sm">
              <Icon name="cloud_download" variant="outlined" />
            </Button>
            <Button isIconOnly variant="light" size="sm">
              <Icon name="search" variant="outlined" />
            </Button>
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
