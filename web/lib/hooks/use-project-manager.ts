import { EditorContext } from "@/components/providers/editor-context-provider";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { addToast } from "@heroui/react";
import { useContext, useState } from "react";
import { ProjectInfo, ProjectMemberInfo } from "../types";

export function useProjectManager() {
  const editorContext = useContext(EditorContext);

  const [isLoading, setIsLoading] = useState(false);

  const projects = editorContext?.editorStates.projectsInfo;

  function openProject(projectName: string) {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      project: projectName,
    }));
  }

  async function refreshProjects() {
    setIsLoading(true);
    try {
      const res = await fetchAPI("/api/project/list");
      if (!res.ok) {
        addToast({
          title: "Failed to fetch projects",
          description:
            res.status === 401 ? "Are you signed in?" : undefined,
          color: "danger",
        });
        return;
      }
      const data = await res.json();
      const projectsInfo: ProjectInfo[] = data.map((proj: any) => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        onboardingCompleted: proj.onboardingCompleted,
        ctime: new Date(proj.createdAt),
        role: proj.role,
        memberCount: proj.memberCount,
        workflowCount: proj.workflowCount,
      }));
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        projectsInfo,
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function createProject(project: ProjectInfo) {
    if (project.name === "") {
      addToast({
        title: "Unable to create project.",
        description: "Project Name is required.",
        color: "danger",
      });
      return;
    }

    try {
      const res = await fetchAPI("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: project.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create project");
      }
      addToast({ title: "Project created.", color: "success" });
    } catch (e: any) {
      addToast({
        title: "Unable to create project.",
        description: e?.message || "Failed to create project.",
        color: "danger",
      });
    }
  }

  async function updateProject(
    oldProjectName: string,
    newProjectInfo: ProjectInfo,
  ) {
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

    try {
      const res = await fetchAPI("/api/project/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: oldProjectName, updatedInfo: newProjectInfo }),
      });
      if (!res.ok) throw new Error("Failed to update project");
      addToast({ title: "Project updated.", color: "success" });
    } catch {
      addToast({
        title: "Unable to update project.",
        description: "Failed to update project.",
        color: "danger",
      });
    }
  }

  async function deleteProject(projectName: string, deleteWorkflows?: boolean) {
    if (!projectName) {
      addToast({
        title: "Unable to delete project.",
        description: "No project selected.",
        color: "danger",
      });
      return;
    }

    try {
      const res = await fetchAPI("/api/project/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, deleteWorkflows }),
      });
      if (!res.ok) throw new Error("Failed to delete project");
      addToast({
        title: "Project deleted.",
        description: `Project ${projectName} has been deleted.`,
        color: "success",
      });
    } catch {
      addToast({
        title: "Unable to delete project.",
        description: "Failed to delete project.",
        color: "danger",
      });
    }
  }

  async function inviteToProject(projectId: string, email: string, role?: string) {
    const res = await fetchAPI("/api/project/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, email, role }),
    });
    if (!res.ok) {
      const msg = await res.text();
      addToast({ title: "Failed to send invite", description: msg, color: "danger" });
      return null;
    }
    addToast({ title: "Invitation sent", color: "success" });
    return res.json();
  }

  async function listMembers(projectId: string): Promise<ProjectMemberInfo[]> {
    const res = await fetchAPI(`/api/project/members?projectId=${projectId}`);
    if (!res.ok) return [];
    return res.json();
  }

  async function removeMember(projectId: string, memberId: string) {
    const res = await fetchAPI("/api/project/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, memberId }),
    });
    if (!res.ok) {
      addToast({ title: "Failed to remove member", color: "danger" });
      return false;
    }
    addToast({ title: "Member removed", color: "success" });
    return true;
  }

  async function assignWorkflowToProject(projectId: string, workflowId: string) {
    const res = await fetchAPI("/api/project/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, workflowId }),
    });
    if (!res.ok) {
      addToast({ title: "Failed to assign workflow", color: "danger" });
      return false;
    }
    return true;
  }

  function setActiveProject(projectId: string | undefined) {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      activeProjectId: projectId,
    }));
  }

  return {
    isLoading,
    projects,
    activeProjectId: editorContext?.editorStates.activeProjectId,
    openProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
    inviteToProject,
    listMembers,
    removeMember,
    assignWorkflowToProject,
    setActiveProject,
  };
}
