import {
  FileSystemObject,
  ListPathOptions,
  OpenFileDialogConfig,
  PersistentSettings,
  ProjectInfo,
} from "@/lib/types";
import { AbstractPlatformAPI } from "../abstract-platform-api";

export class ElectronAPI extends AbstractPlatformAPI {
  electronAPI: any;
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

  async listProjects(projectHomePath: string): Promise<ProjectInfo[]> {
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
    return await this.electronAPI?.hasFile(uri);
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
      await this.electronAPI?.loadSettings();

    return persistentSettings;
  }

  async setPersistentSettings(settings: PersistentSettings): Promise<void> {
    await this.electronAPI?.saveSettings(settings);
  }

  async resetPersistentSettings(): Promise<void> {
    await this.electronAPI?.saveSettings({});
  }

  async getInstallationPath(): Promise<string> {
    return await this.electronAPI?.getInstallationPath();
  }

  async createTerminal(): Promise<string> {
    return await this.electronAPI?.createTerminal();
  }
}
