"use client";

import { SideMenuTabEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { ProjectInfo } from "@/lib/types";
import { Button, Spinner } from "@heroui/react";
import { useContext } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import ProjectItem from "./project-item";

export default function ProjectExplorer() {
  const editorContext = useContext(EditorContext);

  const { session } = useAuth();
  const { projects, isLoading, openProject } = useProjectManager();

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {session ? (
        <div>
          <p className="text-center text-lg font-medium">Manage Projects</p>
          <Button
            className="w-full"
            onPress={() => {
              editorContext?.updateModalStates({
                projectSettings: { isOpen: true },
              });
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
              onOpen={(project: ProjectInfo) => {
                openProject(project.name);
                editorContext?.setEditorStates((prev) => ({
                  ...prev,
                  sideMenuTab: SideMenuTabEnum.Apps,
                }));
              }}
            />
          ))}
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
