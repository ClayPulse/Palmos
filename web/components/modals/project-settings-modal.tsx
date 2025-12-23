"use client";

import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { ProjectInfo } from "@/lib/types";
import { addToast, Button, Input } from "@heroui/react";
import { useEffect, useState } from "react";
import ModalWrapper from "./modal-wrapper";

export default function ProjectSettingsModal({
  isOpen,
  setIsOpen,
  projectInfo,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  projectInfo?: ProjectInfo;
}) {
  const { createProject, updateProject, deleteProject, refreshProjects } =
    useProjectManager();

  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (projectInfo) {
      setProjectName(projectInfo.name);
    }
  }, [projectInfo]);

  async function handleUpdateProject() {
    if (!projectInfo) {
      addToast({
        title: "No project selected.",
        color: "danger",
      });
      return;
    }

    await updateProject(projectInfo.name, { name: projectName });
    setIsOpen(false);
    await refreshProjects();
  }

  async function handleCreateProject() {
    await createProject({ name: projectName });
    setIsOpen(false);
    await refreshProjects();
  }

  async function handleDeleteProject() {
    if (!projectInfo) {
      addToast({
        title: "No project selected.",
        color: "danger",
      });
      return;
    }

    await deleteProject(projectInfo.name);
    setIsOpen(false);
    await refreshProjects();
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Project Settings"
    >
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        <Input
          label="Project Name"
          isRequired
          value={projectName}
          onValueChange={setProjectName}
        />

        <div className="flex gap-x-2">
          {projectInfo ? (
            <Button onPress={handleUpdateProject}>Update</Button>
          ) : (
            <Button onPress={handleCreateProject} color="primary">
              Create
            </Button>
          )}

          {projectInfo && (
            <Button onPress={handleDeleteProject} color="danger">
              Delete
            </Button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
