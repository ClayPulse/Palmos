import { ContextMenuState, ProjectInfo } from "@/lib/types";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { Button, Chip } from "@heroui/react";
import { useContext, useState } from "react";
import { useTranslations } from "@/lib/hooks/use-translations";
import ContextMenu from "../../interface/context-menu";
import { EditorContext } from "../../providers/editor-context-provider";

export default function ProjectItem({
  project,
  onOpen,
}: {
  project: ProjectInfo;
  onOpen?: (project: ProjectInfo) => void;
}) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);
  const { activeProjectId, setActiveProject } = useProjectManager();
  const isActive = project.id != null && project.id === activeProjectId;

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
          <div className="flex items-center gap-2">
            <p>{projectName}</p>
            {isActive && (
              <Chip size="sm" color="primary" variant="flat">
                AI
              </Chip>
            )}
            {project.role && project.role !== "owner" && (
              <Chip size="sm" variant="flat">
                {project.role}
              </Chip>
            )}
          </div>
          <p className="text-xs">{t("projectItem.created") + projectCtime}</p>
        </div>
      </Button>
      <ContextMenu state={contextMenuState} setState={setContextMenuState}>
        <div className="flex flex-col">
          <Button
            className="text-medium h-12 sm:h-8 sm:text-sm"
            variant="light"
            onPress={(e) => {
              editorContext?.updateModalStates({
                projectSettings: { isOpen: true, projectInfo: project },
              });
              setContextMenuState({ x: 0, y: 0, isOpen: false });
            }}
          >
            <p className="w-full text-start">{t("projectItem.projectSettings")}</p>
          </Button>
          <Button
            className="text-medium h-12 sm:h-8 sm:text-sm"
            variant="light"
            onPress={() => {
              if (project.id) {
                setActiveProject(isActive ? undefined : project.id);
              }
              setContextMenuState({ x: 0, y: 0, isOpen: false });
            }}
          >
            <p className="w-full text-start">
              {isActive ? "Unbind from AI" : "Bind to AI Manager"}
            </p>
          </Button>
          <Button
            className="text-medium h-12 sm:h-8 sm:text-sm"
            variant="light"
          >
            <p className="w-full text-start">{t("projectItem.selectMultiple")}</p>
          </Button>
        </div>
      </ContextMenu>
    </div>
  );
}
