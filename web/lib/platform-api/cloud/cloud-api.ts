import {
  FileSystemObject,
  ListPathOptions,
  PersistentSettings,
  ProjectInfo,
  RemoteWorkspace,
} from "@/lib/types";
import { AbstractPlatformAPI } from "../abstract-platform-api";
import toast from "react-hot-toast";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";

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

  async listProjects(projectHomePath: string): Promise<ProjectInfo[]> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
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
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
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
    throw new Error("Method not implemented.");
  }

  async createTerminal(): Promise<string> {
    if (!this.workspace) {
      toast.error("No workspace selected");
      throw new Error("No workspace selected");
    }
    throw new Error("Method not implemented.");
  }
}
