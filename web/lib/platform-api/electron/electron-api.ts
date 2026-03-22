import {
  PersistentSettings,
  ProjectInfo,
} from "@/lib/types";
import { AbstractPlatformAPI } from "../abstract-platform-api";
import { FileSystemObject, ListPathOptions } from "@pulse-editor/shared-utils";

export class ElectronAPI extends AbstractPlatformAPI {
  private electronAPI: any;
  constructor() {
    super();
    // @ts-expect-error window.electronAPI is exposed by the Electron main process
    this.electronAPI = window.electronAPI;
  }

  async selectDir(): Promise<string | undefined> {
    return await this.electronAPI?.selectDir();
  }

  async selectFile(fileExtension?: string): Promise<File> {
    const data = await this.electronAPI?.selectFile(fileExtension ?? "");

    return new File([data], "file");
  }

  async listProjects(
    projectHomePath: string | undefined,
  ): Promise<ProjectInfo[]> {
    if (!projectHomePath) {
      throw new Error("Project home path is undefined");
    }
    return await this.electronAPI?.listProjects(projectHomePath);
  }

  async listPathContent(
    uri: string,
    options: ListPathOptions,
  ): Promise<FileSystemObject[]> {
    return await this.electronAPI?.listPathContent(uri, options);
  }

  async createProject(uri: string): Promise<void> {
    await this.electronAPI?.createProject(uri);
  }

  async deleteProject(uri: string): Promise<void> {
    await this.electronAPI?.deleteProject(uri);
  }

  async updateProject(uri: string, updatedInfo: ProjectInfo): Promise<void> {
    await this.electronAPI?.updateProject(uri, updatedInfo);
  }

  async createFolder(uri: string): Promise<void> {
    await this.electronAPI?.createFolder(uri);
  }

  async createFile(uri: string): Promise<void> {
    await this.electronAPI?.createFile(uri);
  }

  async rename(oldUri: string, newUri: string): Promise<void> {
    await this.electronAPI?.rename(oldUri, newUri);
  }

  async delete(uri: string): Promise<void> {
    await this.electronAPI?.delete(uri);
  }

  async hasPath(uri: string): Promise<boolean> {
    return await this.electronAPI?.hasPath(uri);
  }

  async readFile(uri: string): Promise<File> {
    const data = await this.electronAPI?.readFile(uri);
    return new File([data], uri);
  }

  /**
   * Write a file to the file system.
   * @param file
   * @param uri
   */
  async writeFile(file: File, uri: string): Promise<void> {
    const data = await file.text();
    await this.electronAPI?.writeFile(data, uri);
  }

  async copyFiles(from: string, to: string): Promise<void> {
    await this.electronAPI?.copyFiles(from, to);
  }

  async getPersistentSettings(): Promise<PersistentSettings> {
    const persistentSettings: PersistentSettings =
      await this.electronAPI?.getPersistentSettings();

    return persistentSettings;
  }

  async setPersistentSettings(settings: PersistentSettings): Promise<void> {
    await this.electronAPI?.setPersistentSettings(settings);
  }

  async resetPersistentSettings(): Promise<void> {
    await this.electronAPI?.setPersistentSettings({});
  }

  async getAppSettings(
    appId: string,
  ): Promise<{ id?: string; key: string; value: string; isSecret: boolean }[]> {
    return (await this.electronAPI?.getAppSettings(appId)) ?? [];
  }

  async setAppSetting(
    appId: string,
    key: string,
    value: string,
    isSecret: boolean,
  ): Promise<void> {
    await this.electronAPI?.setAppSetting(appId, key, value, isSecret);
  }

  async deleteAppSetting(appId: string, key: string): Promise<void> {
    await this.electronAPI?.deleteAppSetting(appId, key);
  }

  async getInstallationPath(): Promise<string> {
    return await this.electronAPI?.getInstallationPath();
  }

  async createTerminal(): Promise<string> {
    return await this.electronAPI?.createTerminal();
  }
}
