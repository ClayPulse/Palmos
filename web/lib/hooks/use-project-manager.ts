import { EditorContext } from "@/components/providers/editor-context-provider";
import { addToast } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import { isWeb } from "../platform-api/platform-checker";
import { ProjectInfo } from "../types";
import { useAuth } from "./use-auth";
import { usePlatformApi } from "./use-platform-api";

export function useProjectManager() {
  const editorContext = useContext(EditorContext);

  const { session } = useAuth();
  const { platformApi } = usePlatformApi();

  const [isLoading, setIsLoading] = useState(false);

  const projects = editorContext?.editorStates.projectsInfo;

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
  }, [editorContext?.persistSettings?.projectHomePath, platformApi, session]);

  function openProject(projectName: string) {
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        project: projectName,
      };
    });
  }

  async function refreshProjects() {
    if (!platformApi) {
      return;
    }
    const homePath = editorContext?.persistSettings?.projectHomePath;
    const projects = await platformApi.listProjects(homePath);
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        projectsInfo: projects,
      };
    });
  }

  async function createProject(project: ProjectInfo) {
    if (!platformApi) {
      addToast({
        title: "Unable to create project.",
        description: "Unknown platform.",
        color: "danger",
      });
      return;
    }

    if (project.name === "") {
      addToast({
        title: "Unable to create project.",
        description: "Project Name is required.",
        color: "danger",
      });
      return;
    }

    // Create project
    const homePath = editorContext?.persistSettings?.projectHomePath;
    if (!homePath && !isWeb()) {
      addToast({
        title: "Unable to create project.",
        description: "Project Home Path is not set.",
        color: "danger",
      });
      return;
    }

    try {
      await platformApi.createProject(project.name);
      addToast({
        title: "Project created.",
        color: "success",
      });
    } catch (err) {
      addToast({
        title: "Unable to create project.",
        description: "Failed to create project.",
        color: "danger",
      });
    }
  }

  async function updateProject(
    oldProjectName: string,
    newProjectInfo: ProjectInfo,
  ) {
    if (!platformApi) {
      addToast({
        title: "Unable to update project.",
        description: "Unknown platform.",
        color: "danger",
      });
      return;
    }

    if (!oldProjectName) {
      addToast({
        title: "Unable to update project.",
        description: "No project selected.",
        color: "danger",
      });
      return;
    }

    if (newProjectInfo.name === "") {
      addToast({
        title: "Unable to update project.",
        description: "Project Name is required.",
        color: "danger",
      });
      return;
    }

    const homePath = editorContext?.persistSettings?.projectHomePath;
    if (!homePath && !isWeb()) {
      addToast({
        title: "Unable to update project.",
        description: "Project Home Path is not set.",
        color: "danger",
      });
      return;
    }

    const uri = homePath ? homePath + "/" + oldProjectName : oldProjectName;

    try {
      await platformApi.updateProject(uri, { name: newProjectInfo.name });
      addToast({
        title: "Project updated.",
        color: "success",
      });
    } catch (err) {
      addToast({
        title: "Unable to update project.",
        description: "Failed to update project.",
        color: "danger",
      });
    }
  }

  async function deleteProject(projectName: string) {
    if (!platformApi) {
      addToast({
        title: "Unable to delete project.",
        description: "Unknown platform.",
        color: "danger",
      });
      return;
    }

    if (!projectName) {
      addToast({
        title: "Unable to delete project.",
        description: "No project selected.",
        color: "danger",
      });
      return;
    }

    const homePath = editorContext?.persistSettings?.projectHomePath;
    if (!homePath && !isWeb()) {
      addToast({
        title: "Unable to delete project.",
        description: "Project Home Path is not set.",
        color: "danger",
      });
      return;
    }

    try {
      await platformApi.deleteProject(projectName);
      addToast({
        title: "Project deleted.",
        description: `Project ${projectName} has been deleted.`,
        color: "success",
      });
    } catch (err) {
      addToast({
        title: "Unable to delete project.",
        description: "Failed to delete project.",
        color: "danger",
      });
    }
  }

  return {
    isLoading,
    projects,
    openProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
  };
}
