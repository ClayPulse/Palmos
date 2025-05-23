import {
  FileSystemObject,
  ListPathOptions,
  PersistentSettings,
  ProjectInfo,
} from "@/lib/types";
import { AbstractPlatformAPI } from "../abstract-platform-api";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import ignore from "ignore";
import path from "path";

export class CapacitorAPI extends AbstractPlatformAPI {
  constructor() {
    super();

    this.initCapacitorPlatformAPI();
  }

  private async initCapacitorPlatformAPI() {
    // If "projects" directory does not exist, create it
    try {
      await Filesystem.readdir({
        path: "/projects",
        directory: Directory.ExternalStorage,
      });
    } catch (e) {
      Filesystem.mkdir({
        path: "/projects",
        directory: Directory.ExternalStorage,
      });
    }
  }

  /* This is not implemented on Android because files not written by this app cannot be read. */
  async selectDir(): Promise<string | undefined> {
    throw new Error("Method not implemented.");
  }

  async selectFile(fileExtension?: string): Promise<File> {
    const files = await FilePicker.pickFiles({
      limit: 1,
      types: [fileExtension ? "application/" + fileExtension : "*/*"],
      readData: true,
    });

    const fileObj = files.files[0];
    if (!fileObj) {
      throw new Error("No file selected");
    } else if (!fileObj.data) {
      throw new Error("File data is empty");
    }

    const base64 = fileObj.data;
    const data = atob(base64);

    return new File(
      [new Blob([new Uint8Array(data.split("").map((c) => c.charCodeAt(0)))])],
      fileObj.name,
    );
  }

  async listProjects(projectHomePath: string): Promise<ProjectInfo[]> {
    const pathDir = this.getStoragePathAndDir(projectHomePath);
    const files = await Filesystem.readdir(pathDir);

    const folders = files.files
      .filter((file) => file.type === "directory")
      .map((file) => ({
        name: file.name,
        ctime: file.ctime ? new Date(file.ctime) : new Date(),
      }));

    return folders;
  }

  async listPathContent(
    uri: string,
    options: ListPathOptions,
    baseUri?: string,
  ): Promise<FileSystemObject[]> {
    // Try to get permissions to read the directory
    const permission = await Filesystem.requestPermissions();
    if (permission.publicStorage !== "granted") {
      throw new Error("Permission denied");
    }

    const pathDir = this.getStoragePathAndDir(uri);

    const files = await Filesystem.readdir({
      ...pathDir,
    });

    const promise = files.files
      // Filter by types
      .filter(
        (file) =>
          (options?.include === "folders" && file.type === "directory") ||
          (options?.include === "files" && file.type === "file") ||
          options?.include === "all",
      )
      // Filter by gitignore
      .filter((file) => {
        if (!options?.gitignore) {
          return true;
        }
        const ig = ignore().add(options.gitignore);

        const filePath = baseUri
          ? path.relative(baseUri, path.join(uri, file.name))
          : file.name;

        const isIgnored = ig.ignores(filePath);

        return !isIgnored;
      })
      .map(async (file) => {
        const absoluteUri = uri + "/" + file.name;
        if (file.type === "directory") {
          const dirObj: FileSystemObject = {
            name: file.name,
            isFolder: true,
            subDirItems: options?.isRecursive
              ? await this.listPathContent(absoluteUri, options, baseUri ?? uri)
              : [],
            uri: absoluteUri,
          };
          return dirObj;
        } else {
          const fileObj: FileSystemObject = {
            name: file.name,
            isFolder: false,
            uri: absoluteUri,
          };
          return fileObj;
        }
      });

    const fileSystemObjects = await Promise.all(promise);

    return fileSystemObjects;
  }

  async createProject(uri: string): Promise<void> {
    const pathDir = this.getStoragePathAndDir(uri);
    await Filesystem.mkdir({
      ...pathDir,
    });
  }

  async createFolder(uri: string): Promise<void> {
    console.log("Creating folder at", uri);
    const pathDir = this.getStoragePathAndDir(uri);
    await Filesystem.mkdir({
      ...pathDir,
    });
  }

  async createFile(uri: string): Promise<void> {
    console.log("Creating file at", uri);
    const pathDir = this.getStoragePathAndDir(uri);
    await Filesystem.writeFile({
      ...pathDir,
      data: "",
      encoding: Encoding.UTF8,
    });
  }

  async rename(oldUri: string, newUri: string): Promise<void> {
    const oldPathDir = this.getStoragePathAndDir(oldUri);
    const newPathDir = this.getStoragePathAndDir(newUri);
    await Filesystem.rename({
      from: oldPathDir.path,
      to: newPathDir.path,
      directory: oldPathDir.directory,
      toDirectory: newPathDir.directory,
    });
  }

  async delete(uri: string): Promise<void> {
    // Check if it's a file or a directory
    const pathDir = this.getStoragePathAndDir(uri);

    const file = await Filesystem.stat({
      ...pathDir,
    });

    if (file.type === "directory") {
      await Filesystem.rmdir({
        ...pathDir,
        recursive: true,
      });
    } else if (file.type === "file") {
      await Filesystem.deleteFile({
        ...pathDir,
      });
    }
  }

  async hasPath(uri: string): Promise<boolean> {
    try {
      const pathDir = this.getStoragePathAndDir(uri);
      await Filesystem.stat({
        ...pathDir,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async readFile(uri: string): Promise<File> {
    const pathDir = this.getStoragePathAndDir(uri);
    const res = await Filesystem.readFile({
      path: pathDir.path,
      directory: pathDir.directory,
      encoding: Encoding.UTF8,
    });

    return new File([res.data as BlobPart], uri);
  }

  /**
   * Write a file to the file system. On mobile, this will write to Pulse Editor's
   * default directory.
   * @param file
   * @param uri
   */
  async writeFile(file: File, uri: string): Promise<void> {
    try {
      const pathDir = this.getStoragePathAndDir(uri);
      await Filesystem.writeFile({
        ...pathDir,
        data: await file.text(),
        encoding: Encoding.UTF8,
      });
    } catch (e) {
      console.error("Error writing file", e);
    }
  }

  async copyFiles(from: string, to: string): Promise<void> {
    const oldPathDir = this.getStoragePathAndDir(from);
    const newPathDir = this.getStoragePathAndDir(to);
    await Filesystem.copy({
      from: oldPathDir.path,
      to: newPathDir.path,
      directory: oldPathDir.directory,
      toDirectory: newPathDir.directory,
    });
  }

  async getPersistentSettings(): Promise<PersistentSettings> {
    const pathDir = this.getDataPathDir("settings.json");
    try {
      const res = await Filesystem.readFile({
        ...pathDir,
        encoding: Encoding.UTF8,
      });

      const settings = JSON.parse(res.data as string);

      settings.projectHomePath = "/projects";

      return settings;
    } catch (e) {
      return {
        projectHomePath: "/projects",
      };
    }
  }

  async setPersistentSettings(settings: PersistentSettings): Promise<void> {
    const pathDir = this.getDataPathDir("settings.json");
    await Filesystem.writeFile({
      ...pathDir,
      data: JSON.stringify(settings),
      encoding: Encoding.UTF8,
    });
  }

  async resetPersistentSettings(): Promise<void> {
    const pathDir = this.getDataPathDir("settings.json");
    await Filesystem.deleteFile({
      ...pathDir,
    });
  }

  async getInstallationPath(): Promise<string> {
    return "";
  }

  async createTerminal(): Promise<string> {
    throw new Error(
      "Method not implemented. Please use Termux for terminal connection via SSH.",
    );
  }

  private getStoragePathAndDir(uri: string): {
    path: string;
    directory: Directory;
  } {
    return {
      path: uri.replace(
        "content://com.android.externalstorage.documents/tree/primary%3A",
        "",
      ),
      directory: Directory.ExternalStorage,
    };
  }

  private getDataPathDir(uri: string) {
    return {
      path: uri,
      directory: Directory.Data,
    };
  }
}
