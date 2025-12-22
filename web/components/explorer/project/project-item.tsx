import { ContextMenuState, ProjectInfo } from "@/lib/types";
import { Button } from "@heroui/react";
import { useContext, useState } from "react";
import ContextMenu from "../../interface/context-menu";
import { EditorContext } from "../../providers/editor-context-provider";

export default function ProjectItem({
  project,
  setSettingsOpen,
  setSettingsProject,
  onOpen,
}: {
  project: ProjectInfo;
  setSettingsOpen: (isOpen: boolean) => void;
  setSettingsProject: (project: ProjectInfo) => void;
  onOpen?: (project: ProjectInfo) => void;
}) {
  const editorContext = useContext(EditorContext);

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  const projectName = project.name;
  const projectCtime = project.ctime
    ? formatDateTime(project.ctime)
    : "Unknown";

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
            if (onOpen) {
              onOpen(project);
            }
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
          <p>{projectName}</p>
          <p className="text-xs">{"Created: " + projectCtime}</p>
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
