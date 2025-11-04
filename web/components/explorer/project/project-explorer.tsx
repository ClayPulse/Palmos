"use client";

import { SideMenuTabEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { ProjectInfo } from "@/lib/types";
import { Button, Spinner } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import ProjectSettingsModal from "../../modals/project-settings-modal";
import { EditorContext } from "../../providers/editor-context-provider";
import ProjectItem from "./project-item";

export default function ProjectExplorer() {
  const editorContext = useContext(EditorContext);

  const { session } = useAuth();
  const { platformApi } = usePlatformApi();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProject, setSettingsProject] = useState<
    ProjectInfo | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editorContext?.editorStates.project) {
      // Get workflows stored either on cloud or locally in project/.workflows
    }
  }, [editorContext?.editorStates.project]);

  useEffect(() => {
    if (platformApi && session) {
      const homePath = editorContext?.persistSettings?.projectHomePath;

      setIsLoading(true);
      platformApi.listProjects(homePath).then((projects) => {
        editorContext?.setEditorStates((prev) => {
          return {
            ...prev,
            projectsInfo: projects,
          };
        });
        setIsLoading(false);
      });
    }
  }, [editorContext?.persistSettings, platformApi, session]);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {session ? (
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
          {isLoading &&
            (editorContext?.editorStates.projectsInfo ?? []).length === 0 && (
              <div className="flex justify-center">
                <Spinner />
              </div>
            )}
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
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center pb-24">
          <p className="text-center text-lg font-medium">
            Sign in to view your projects,
            <br />
            or open a local project with desktop client.
          </p>
        </div>
      )}
    </div>
  );
}
