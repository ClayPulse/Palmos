"use client";

import { useContext, useState } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import { Button } from "@heroui/react";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { ContextMenuState, ProjectInfo } from "@/lib/types";
import ContextMenu from "../interface/context-menu";
import ProjectSettingsModal from "../modals/project-settings-modal";

export default function ProjectList() {
  const editorContext = useContext(EditorContext);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProject, setSettingsProject] = useState<
    ProjectInfo | undefined
  >(undefined);

  return (
    <div className="flex w-full flex-col gap-2">
      {editorContext?.editorStates.projectsInfo?.map((project, index) => (
        <ProjectTab
          key={index}
          project={project}
          setSettingsOpen={setSettingsOpen}
          setSettingsProject={setSettingsProject}
        />
      ))}
      <ProjectSettingsModal
        isOpen={settingsOpen}
        setIsOpen={setSettingsOpen}
        projectInfo={settingsProject}
      />
    </div>
  );
}

function ProjectTab({
  project,
  setSettingsOpen,
  setSettingsProject,
}: {
  project: ProjectInfo;
  setSettingsOpen: (isOpen: boolean) => void;
  setSettingsProject: (project: ProjectInfo) => void;
}) {
  const editorContext = useContext(EditorContext);
  const { platformApi } = usePlatformApi();
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  function openProject(projectName: string) {
    const uri =
      editorContext?.persistSettings?.projectHomePath + "/" + projectName;

    platformApi
      ?.listPathContent(uri, {
        include: "all",
        isRecursive: true,
      })
      .then((objects) => {
        editorContext?.setEditorStates((prev) => {
          return {
            ...prev,
            project: projectName,
            projectContent: objects,
          };
        });
      });
  }

  function formatDateTime(date: Date) {
    const year = date.getFullYear();
    const month = (1 + date.getMonth()).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    return year + "-" + month + "-" + day + " " + hour + ":" + minute;
  }

  return (
    <div className="relative">
      <Button
        className="w-full"
        variant="light"
        onPress={(e) => {
          // Only open project if context menu is not open
          if (!contextMenuState.isOpen) {
            openProject(project.name);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          // Get parent element position
          const current = e.currentTarget as HTMLElement;
          const parent = current.parentElement as HTMLElement;
          const parentRect = parent.getBoundingClientRect();

          setContextMenuState({
            x: e.clientX - parentRect.left,
            y: e.clientY - parentRect.top,
            isOpen: true,
          });
        }}
      >
        <div className="flex w-full flex-col items-start justify-center">
          <p>{project.name}</p>
          <p className="text-xs">
            {"Created: " + formatDateTime(project.ctime)}
          </p>
        </div>
      </Button>
      <ContextMenu state={contextMenuState} setState={setContextMenuState}>
        <div className="flex flex-col">
          <Button
            className="text-medium h-12 sm:h-8 sm:text-sm"
            variant="light"
            onPress={(e) => {
              setSettingsOpen(true);
              setSettingsProject(project);
              setContextMenuState({ x: 0, y: 0, isOpen: false });
            }}
          >
            <p className="w-full text-start">Project Settings</p>
          </Button>
          <Button
            className="text-medium h-12 sm:h-8 sm:text-sm"
            variant="light"
          >
            <p className="w-full text-start">Select Multiple</p>
          </Button>
        </div>
      </ContextMenu>
    </div>
  );
}
