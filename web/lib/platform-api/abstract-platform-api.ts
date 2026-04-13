import { FileSystemObject, ListPathOptions } from "@pulse-editor/shared-utils";
import { PersistentSettings } from "../types";

export abstract class AbstractPlatformAPI {
  // Show a selection dialogue to pick a directory.
  // Returns the path of the selected directory.
  abstract selectDir(): Promise<string | undefined>;

  // Pick a file
  abstract selectFile(fileExtension?: string): Promise<File>;

  // Discover project content
  abstract listPathContent(
    uri: string,
    options: ListPathOptions,
  ): Promise<FileSystemObject[]>;

  // Create folder
  abstract createFolder(uri: string): Promise<void>;
  // Create file
  abstract createFile(uri: string): Promise<void>;

  // Update file object
  abstract rename(oldUri: string, newUri: string): Promise<void>;
  // Delete file object
  abstract delete(uri: string): Promise<void>;

  abstract hasPath(uri: string): Promise<boolean>;
  abstract readFile(uri: string): Promise<File>;
  abstract writeFile(file: File, uri: string): Promise<void>;

  abstract copyFiles(from: string, to: string): Promise<void>;

  // Persistent settings
  abstract getPersistentSettings(): Promise<PersistentSettings>;
  abstract setPersistentSettings(settings: PersistentSettings): Promise<void>;
  abstract resetPersistentSettings(): Promise<void>;

  // Per-app settings
  abstract getAppSettings(
    appId: string,
  ): Promise<Record<string, string>>;
  abstract setAppSetting(
    appId: string,
    key: string,
    value: string,
    isSecret: boolean,
  ): Promise<void>;
  abstract deleteAppSetting(appId: string, key: string): Promise<void>;

  // Get installation path
  abstract getInstallationPath(): Promise<string>;

  // Create a new terminal and get socket
  abstract createTerminal(): Promise<string>;
}
