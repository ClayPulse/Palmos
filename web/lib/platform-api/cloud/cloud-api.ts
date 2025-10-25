import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import {
  FileSystemObject,
  ListPathOptions,
  PersistentSettings,
  ProjectInfo,
  RemoteWorkspace,
} from "@/lib/types";
import toast from "react-hot-toast";
import { AbstractPlatformAPI } from "../abstract-platform-api";

/**
 * Cloud Platform API
 *
 * This API will manage projects on the cloud server,
 * so users can access their projects from any device.
 *
 * In case of need to access file system,
 * Cloud API will interact with the remote workspace,
 * but only limit to necessary file system operations.
 * It will not save any project data on the remote workspace.
 */
export class CloudAPI extends AbstractPlatformAPI {
  private workspace: RemoteWorkspace | undefined;

  constructor(workspace: RemoteWorkspace | undefined) {
    super();
    this.workspace = workspace;
  }

  async selectDir(): Promise<string | undefined> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async selectFile(fileExtension?: string): Promise<File> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async listProjects(
    projectHomePath: string | undefined,
  ): Promise<ProjectInfo[]> {
    // projectHomePath is ignored in cloud environment

    const response = await fetchAPI("/api/project/list");

    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }

    const projects = await response.json();

    const projectsInfo: ProjectInfo[] = projects.map((proj: any) => ({
      name: proj.name,
      ctime: new Date(proj.createdAt),
    }));
    return projectsInfo;
  }

  async listPathContent(
    uri: string,
    options: ListPathOptions,
  ): Promise<FileSystemObject[]> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "list-path-content",
        args: { uri, options },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to list path content");
    }

    const data = await response.json();
    return data;
  }

  async createProject(uri: string): Promise<void> {
    const response = await fetchAPI("/api/project/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: uri }),
    });

    if (!response.ok) {
      throw new Error("Failed to create project");
    }
  }

  async deleteProject(uri: string): Promise<void> {
    const response = await fetchAPI("/api/project/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: uri }),
    });
    if (!response.ok) {
      throw new Error("Failed to delete project");
    }
  }

  async updateProject(uri: string, updatedInfo: ProjectInfo): Promise<void> {
    const response = await fetchAPI("/api/project/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: uri, updatedInfo }),
    });
    if (!response.ok) {
      throw new Error("Failed to update project");
    }
  }

  async createFolder(uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "create-folder",
        args: { uri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create folder");
    }
  }

  async createFile(uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "create-file",
        args: { uri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create file");
    }
  }

  async rename(oldUri: string, newUri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "rename",
        args: { oldUri, newUri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to rename file");
    }
  }

  async delete(uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "delete",
        args: { uri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete file");
    }
  }

  // Reserved for cloud environment implementation
  async hasPath(uri: string): Promise<boolean> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "has-path",
        args: { uri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to check if path exists");
    }

    const data = await response.json();
    return data === true;
  }

  async readFile(uri: string): Promise<File> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "read-file",
        args: { uri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to read file");
    }

    const data = await response.json();

    return new File([data], uri);
  }

  async writeFile(file: File, uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const text = await file.text();

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "write-file",
        args: { data: text, uri },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to write file");
    }

    return;
  }

  async copyFiles(from: string, to: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "copy-files",
        args: { from, to },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to copy files");
    }
  }

  /* Persistent Settings */
  async getPersistentSettings(): Promise<PersistentSettings> {
    const response = await fetchAPI("/api/editor/persistent-settings/get", {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch persistent settings");
    }

    const settings: PersistentSettings = await response.json();

    settings.projectHomePath = "/workspace";

    return settings;
  }

  async setPersistentSettings(settings: PersistentSettings) {
    const response = await fetchAPI("/api/editor/persistent-settings/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error("Failed to save persistent settings");
    }
    return;
  }

  async resetPersistentSettings() {
    this.setPersistentSettings({});
  }

  async getInstallationPath(): Promise<string> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    return "/workspace";
  }

  async createTerminal(): Promise<string> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }

    const response = await fetchAPI(`/api/workspace/platform-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: this.workspace.id,
        operation: "create-terminal",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create terminal");
    }

    const data = await response.text();
    return data;
  }
}
