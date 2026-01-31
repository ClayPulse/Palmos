"use client";

import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { Key, useContext } from "react";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";

export default function ProjectIndicator() {
  const t = useTranslations();
  const editorContext = useContext(EditorContext);
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
      editorContext?.updateModalStates({
        projectSettings: {
          isOpen: true,
          projectInfo: editorContext?.editorStates.projectsInfo?.find(
            (project) => project.name === editorContext?.editorStates.project,
          ),
        },
      });
    }
  }

  return (
    <div className="flex w-full items-center justify-center gap-x-0.5 pl-8">
      <p className="font-semibold">{editorContext?.editorStates.project}</p>
      <Dropdown>
        <DropdownTrigger>
          <Button onPress={() => {}} isIconOnly variant="light" size="sm">
            <Icon name="expand_more" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu onAction={handleProjectMenu}>
          <DropdownItem key="close">
            <p>{t("projectIndicator.closeProject.menuItem")}</p>
          </DropdownItem>
          <DropdownItem key="settings">
            <p>{t("projectIndicator.projectSettings.menuItem")}</p>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
