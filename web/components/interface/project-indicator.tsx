"use client";

import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { Key, useContext, useState } from "react";
import Icon from "../misc/icon";
import ProjectSettingsModal from "../modals/project-settings-modal";
import { EditorContext } from "../providers/editor-context-provider";

export default function ProjectIndicator() {
  const editorContext = useContext(EditorContext);
  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] =
    useState(false);
  const { closeAllTabViews } = useTabViewManager();

  function closeProject() {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        project: "",
        workspaceContent: [],
      };
    });

    // Clear view manager
    closeAllTabViews();
  }

  function handleProjectMenu(key: Key) {
    if (key === "close") {
      closeProject();
    } else if (key === "settings") {
      setIsProjectSettingsModalOpen(true);
    }
  }

  return (
    <div className="flex w-full items-center justify-center pl-8">
      <p>{editorContext?.editorStates.project}</p>
      <Dropdown>
        <DropdownTrigger>
          <Button onPress={() => {}} isIconOnly variant="light" size="sm">
            <Icon name="expand_more" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu onAction={handleProjectMenu}>
          <DropdownItem key="close">
            <p>Close Project</p>
          </DropdownItem>
          <DropdownItem key="settings">
            <p>Project Settings</p>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <ProjectSettingsModal
        isOpen={isProjectSettingsModalOpen}
        setIsOpen={setIsProjectSettingsModalOpen}
        projectInfo={editorContext?.editorStates.projectsInfo?.find(
          (project) => project.name === editorContext?.editorStates.project,
        )}
      />
    </div>
  );
}
