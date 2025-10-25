"use client";

import { SideMenuTabEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { ProjectInfo } from "@/lib/types";
import { Button } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import ProjectSettingsModal from "../../modals/project-settings-modal";
import { EditorContext } from "../../providers/editor-context-provider";
import ProjectItem from "./project-item";

export default function ProjectExplorer() {
  const editorContext = useContext(EditorContext);

  const { platformApi } = usePlatformApi();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProject, setSettingsProject] = useState<
    ProjectInfo | undefined
  >(undefined);

  useEffect(() => {
    if (editorContext?.editorStates.project) {
      // Get workflows stored either on cloud or locally in project/.workflows
    }
  }, [editorContext?.editorStates.project]);

  useEffect(() => {
    if (platformApi) {
      const homePath = editorContext?.persistSettings?.projectHomePath;

      platformApi.listProjects(homePath).then((projects) => {
        editorContext?.setEditorStates((prev) => {
          return {
            ...prev,
            projectsInfo: projects,
          };
        });
      });
    }
  }, [editorContext?.persistSettings, platformApi]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div>
        <p className="text-center text-lg font-medium">View Projects</p>
        <Button
          className="w-full"
          onPress={() => {
            setSettingsOpen(true);
          }}
        >
          New Project
        </Button>
        {editorContext?.editorStates.projectsInfo?.map((project, index) => (
          <ProjectItem
            key={index}
            project={project}
            setSettingsOpen={setSettingsOpen}
            setSettingsProject={setSettingsProject}
            onOpen={() => {
              editorContext.setEditorStates((prev) => ({
                ...prev,
                sideMenuTab: SideMenuTabEnum.Apps,
              }));
            }}
          />
        ))}
        <ProjectSettingsModal
          isOpen={settingsOpen}
          setIsOpen={setSettingsOpen}
          projectInfo={settingsProject}
        />
      </div>
    </div>
  );
}
