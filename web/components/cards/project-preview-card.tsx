import { ContextMenuState, ProjectInfo, WorkspaceConfig } from "@/lib/types";
import { Button } from "@heroui/react";
import { useContext, useState } from "react";
import { useTranslations } from "@/lib/hooks/use-translations";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";
import { SideMenuTabEnum } from "@/lib/enums";

export function ProjectPreviewCard({
  project,
  workspaceConfig,
}: {
  project: ProjectInfo;
  workspaceConfig?: WorkspaceConfig;
}) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  function openProject(projectName: string) {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        project: projectName,
      };
    });
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      sideMenuTab: SideMenuTabEnum.Apps,
    }));
  }

  return (
    <Button
      className="relative m-0 flex h-full w-full min-w-80 flex-col-reverse justify-start overflow-hidden rounded-lg p-0"
      onPress={(e) => {
        // Only open project if context menu is not open
        if (!contextMenuState.isOpen) {
          openProject(project.name);
        }
      }}
    >
      <div className="absolute top-0 left-0 h-full w-full">
        <div className="h-full w-full">
          <img
            src={"/assets/social-card.png"}
            alt={"Palmos project"}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="bg-content2/75 relative flex w-full flex-col gap-y-0.5 rounded-t-3xl px-3 py-2">
        <h1 className="text-center text-lg font-semibold">{project.name}</h1>

        <div className="grid w-full grid-cols-[auto_max-content]">
          <p className="text-start font-semibold">{t("projectPreviewCard.workspace")}</p>
          <p>{workspaceConfig?.name ?? t("projectPreviewCard.undefined")}</p>
        </div>

        <div className="grid w-full grid-cols-[auto_max-content]">
          <div className="flex w-full gap-x-1">
            <div>
              <Icon name="people" />
            </div>
            <p>1</p>
          </div>
          <p className="whitespace-nowrap">
            {project.ctime ? formatDateTime(project.ctime) : null}
          </p>
        </div>
      </div>
    </Button>
  );
}

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = (1 + date.getMonth()).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return year + "-" + month + "-" + day;
}
