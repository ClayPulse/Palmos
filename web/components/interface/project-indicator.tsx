"use client";

import { Key, useContext, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import Icon from "../misc/icon";
import ProjectSettingsModal from "../modals/project-settings-modal";
import { useViewManager } from "@/lib/hooks/use-view-manager";

export default function ProjectIndicator() {
  const editorContext = useContext(EditorContext);
  const [isProjectSettingsModalOpen, setIsProjectSettingsModalOpen] =
    useState(false);
  const { closeAllViews: closeAllFileViews } = useViewManager();

  function closeProject() {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        project: "",
        projectContent: [],
      };
    });

    // Clear view manager
    closeAllFileViews();
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
