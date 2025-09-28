"use client";

import { Button, Input, Switch } from "@heroui/react";
import ModalWrapper from "./modal-wrapper";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { EditorContext } from "../providers/editor-context-provider";
import { ProjectInfo } from "@/lib/types";
import { isWeb } from "@/lib/platform-api/platform-checker";

export default function ProjectSettingsModal({
  isOpen,
  setIsOpen,
  projectInfo,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  projectInfo?: ProjectInfo;
}) {
  const [projectName, setProjectName] = useState("");

  const { platformApi } = usePlatformApi();
  const editorContext = useContext(EditorContext);

  useEffect(() => {
    if (projectInfo) {
      setProjectName(projectInfo.name);
    }
  }, [projectInfo]);

  function handleUpdateProject() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    }

    if (projectName === "") {
      toast.error("Project Name is required.");
      return;
    }

    // Update project
    const homePath = editorContext?.persistSettings?.projectHomePath;
    if (!homePath && !isWeb()) {
      toast.error("Project Home Path is not set.");
      return;
    }

    if (!projectInfo) {
      toast.error("No project selected.");
      return;
    }

    const uri = homePath
      ? homePath + "/" + projectInfo?.name
      : projectInfo?.name;

    platformApi
      .updateProject(uri, { name: projectName })
      .then(() => {
        toast.success("Project updated.");
        platformApi.listProjects(homePath).then((projects) => {
          editorContext?.setEditorStates((prev) => {
            return {
              ...prev,
              projectsInfo: projects,
            };
          });
        });
        setIsOpen(false);
      })
      .catch((err) => {
        toast.error("Failed to update project.");
      });
  }

  function handleCreateProject() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    }

    if (projectName === "") {
      toast.error("Project Name is required.");
      return;
    }

    // Create project
    const homePath = editorContext?.persistSettings?.projectHomePath;
    if (!homePath && !isWeb()) {
      toast.error("Project Home Path is not set.");
      return;
    }

    const uri = homePath ? homePath + "/" + projectName : projectName;
    platformApi
      .createProject(uri)
      .then(() => {
        toast.success("Project created.");
        platformApi.listProjects(homePath).then((projects) => {
          editorContext?.setEditorStates((prev) => {
            return {
              ...prev,
              projectsInfo: projects,
            };
          });
        });
        setIsOpen(false);
      })
      .catch((err) => {
        toast.error("Failed to create project.");
      });
  }

  function handleDeleteProject() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    }
    if (!projectInfo) {
      toast.error("No project selected.");
      return;
    }

    const homePath = editorContext?.persistSettings?.projectHomePath;
    if (!homePath && !isWeb()) {
      toast.error("Project Home Path is not set.");
      return;
    }
    const uri = homePath ? homePath + "/" + projectInfo.name : projectInfo.name;
    platformApi
      .deleteProject(uri)
      .then(() => {
        toast.success("Project deleted.");
        platformApi.listProjects(homePath).then((projects) => {
          editorContext?.setEditorStates((prev) => {
            return {
              ...prev,
              projectsInfo: projects,
            };
          });
        });
        setIsOpen(false);
      })
      .catch((err) => {
        toast.error("Failed to delete project.");
      });
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
