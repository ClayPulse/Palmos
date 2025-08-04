import {
  FileSystemObject,
  ListPathOptions,
  PersistentSettings,
  ProjectInfo,
} from "@/lib/types";
import { AbstractPlatformAPI } from "../abstract-platform-api";
import toast from "react-hot-toast";

export class RemoteInstance extends AbstractPlatformAPI {
  constructor() {
    super();
  }

  async selectDir(): Promise<string | undefined> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async selectFile(fileExtension?: string): Promise<File> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async listProjects(projectHomePath: string): Promise<ProjectInfo[]> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async listPathContent(
    uri: string,
    options: ListPathOptions,
  ): Promise<FileSystemObject[]> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async createProject(uri: string): Promise<void> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async createFolder(uri: string): Promise<void> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async createFile(uri: string): Promise<void> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async rename(oldUri: string, newUri: string): Promise<void> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  async delete(uri: string): Promise<void> {
    toast.error("Not implemented");
    throw new Error("Method not implemented.");
  }

  // Reserved for cloud environment implementation
  async hasPath(uri: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  async readFile(uri: string): Promise<File> {
    throw new Error("Method not implemented.");
  }
  async writeFile(file: File, uri: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async copyFiles(from: string, to: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /* Persistent Settings */
  async getPersistentSettings(): Promise<PersistentSettings> {
    throw new Error("Method not implemented.");
  }

  async setPersistentSettings(settings: PersistentSettings) {
    throw new Error("Method not implemented.");
  }

  async resetPersistentSettings() {
    throw new Error("Method not implemented.");
  }

  async getInstallationPath(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async createTerminal(): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
