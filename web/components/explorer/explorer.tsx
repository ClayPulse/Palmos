"use client";

import { TreeViewGroupRef } from "@/lib/types";
import { useContext, useEffect, useRef, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import { PlatformEnum } from "@/lib/types";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { Button } from "@heroui/react";
import useExplorer from "@/lib/hooks/use-explorer";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import ProjectSettingsModal from "../modals/project-settings-modal";
import Icon from "../misc/icon";
import toast from "react-hot-toast";
import TreeViewGroup from "./tree-view";
import { useViewManager } from "@/lib/hooks/use-view-manager";
import ProjectList from "./project-list";

export default function Explorer({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  const platform = getPlatform();
  const editorContext = useContext(EditorContext);
  const { selectAndSetProjectHome } = useExplorer();
  const { platformApi } = usePlatformApi();
  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] =
    useState(false);
  const { openFileView } = useViewManager();

  const rootGroupRef = useRef<TreeViewGroupRef | null>(null);

  useEffect(() => {
    if (platformApi) {
      const homePath = editorContext?.persistSettings?.projectHomePath;
      if (homePath) {
        platformApi.listProjects(homePath).then((projects) => {
          editorContext?.setEditorStates((prev) => {
            return {
              ...prev,
              projectsInfo: projects,
            };
          });
        });
      }
    }
  }, [editorContext?.persistSettings, platformApi]);

  // Reset root group ref when there are other nodes selected
  useEffect(() => {
    const selectedNodes =
      editorContext?.editorStates.explorerSelectedNodeRefs ?? [];

    if (selectedNodes.length > 0) {
      rootGroupRef.current?.cancelCreating();
    }
  }, [editorContext?.editorStates.explorerSelectedNodeRefs]);

  function viewFile(uri: string) {
    platformApi?.readFile(uri).then((file) => {
      openFileView(file).then(() => {
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

  // Choose project home path
  if (!editorContext?.persistSettings?.projectHomePath) {
    return (
      <div className="bg-content2 h-full w-full space-y-2 p-4">
        <p>
          You have not set a project home path yet. Please set a project home
          path to continue. All your projects will be saved in this directory.
        </p>
        <Button
          className="w-full"
          onPress={() => {
            selectAndSetProjectHome();
          }}
        >
          Select Project Home Path
        </Button>
      </div>
    );
  }

  // Browse inside a project
  if (editorContext?.editorStates.project) {
    return (
      <div className="bg-content2 relative h-full w-full px-4 py-2">
        {editorContext.editorStates.projectContent?.length === 0 && (
          <div className="pointer-events-none absolute top-0 left-0 m-0 flex h-full w-full flex-col items-center justify-center pb-16">
            <p>Empty content. Create a new file to get started.</p>
          </div>
        )}
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
          <div className="overflow-y-auto">
            <TreeViewGroup
              ref={rootGroupRef}
              objects={editorContext.editorStates.projectContent ?? []}
              viewFile={viewFile}
              folderUri={
                editorContext.persistSettings?.projectHomePath +
                "/" +
                editorContext.editorStates.project
              }
              platformApi={platformApi}
            />
          </div>
        </div>
      </div>
    );
  }
  // Pick project
  else {
    return (
      <div className="bg-content2 h-full w-full space-y-2 overflow-y-auto p-4">
        <Button
          className="w-full"
          onPress={() => {
            setIsProjectSettingsModalOpen(true);
          }}
        >
          New Project
        </Button>
        <ProjectSettingsModal
          isOpen={isProjectSettingsModalOpen}
          setIsOpen={setIsProjectSettingsModalOpen}
        />
        <ProjectList />
      </div>
    );
  }
}
