"use client";

import { SideMenuTabEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { ProjectInfo } from "@/lib/types";
import { Button, Spinner } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import ProjectSettingsModal from "../../modals/project-settings-modal";
import { EditorContext } from "../../providers/editor-context-provider";
import ProjectItem from "./project-item";

export default function ProjectExplorer() {
  const editorContext = useContext(EditorContext);

  const { session } = useAuth();
  const { projects, isLoading } = useProjectManager();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsProject, setSettingsProject] = useState<
    ProjectInfo | undefined
  >(undefined);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {session ? (
        <div>
          <p className="text-center text-lg font-medium">Manage Projects</p>
          <Button
            className="w-full"
            onPress={() => {
              setSettingsOpen(true);
            }}
          >
            New Project
          </Button>
          {isLoading && (projects ?? []).length === 0 && (
            <div className="flex justify-center">
              <Spinner />
            </div>
          )}
          {projects?.map((project, index) => (
            <ProjectItem
              key={index}
              project={project}
              setSettingsOpen={setSettingsOpen}
              setSettingsProject={setSettingsProject}
              onOpen={() => {
                editorContext?.setEditorStates((prev) => ({
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
