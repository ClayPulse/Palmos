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
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
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
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async createFile(uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async rename(oldUri: string, newUri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async delete(uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  // Reserved for cloud environment implementation
  async hasPath(uri: string): Promise<boolean> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    throw new Error("Method not implemented.");
  }
  async readFile(uri: string): Promise<File> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    throw new Error("Method not implemented.");
  }
  async writeFile(file: File, uri: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    throw new Error("Method not implemented.");
  }

  async copyFiles(from: string, to: string): Promise<void> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    throw new Error("Method not implemented.");
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

    const url = `wss://${this.workspace?.id}.workspace.pulse-editor.com/${this.workspace?.id}/terminal/ws`;

    return url;
  }
}
