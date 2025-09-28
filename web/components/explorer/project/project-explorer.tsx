"use client";

import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { ProjectInfo } from "@/lib/types";
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
      {editorContext?.editorStates.projectsInfo?.map((project, index) => (
        <ProjectItem
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
