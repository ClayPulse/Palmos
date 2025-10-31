import fs from "fs";
import ignore from "ignore";
import path from "path";

// Define a safe root directory for projects. Can be overridden by env or configured as needed.
// All incoming URIs will be resolved and validated to ensure they don't escape this root.

// Absolute paths
const appRoot = "/pulse-editor";
const workspaceRoot = "/workspace";

const settingsPath = path.join(appRoot, "settings.json");

function safeWorkspaceResolve(uri: string): string {
  const absPath = path.isAbsolute(uri)
    ? path.resolve(uri)
    : path.resolve(workspaceRoot, uri);

  // Resolve symlinks to their actual paths
  const realPath = fs.existsSync(absPath) ? fs.realpathSync(absPath) : absPath;

  // Ensure it's inside the workspace root (strict, cross-platform)
  const rel = path.relative(workspaceRoot, realPath);
  if (
    rel.startsWith('..') ||
    path.isAbsolute(rel)
  ) {
    throw new Error("Cannot access path outside of workspace path.");
  }

  return realPath;
}

export async function handlePlatformAPIRequest(
  data: {
    operation: string;
    args: any;
  },
  host: string,
  instanceId: string,
): Promise<any> {
  const { operation, args } = data;

  switch (operation) {
    case "select-dir":
      // Folder picker is done via web interface
      throw new Error("Method not implemented.");
    case "select-file":
      // File picker is done via web interface
      throw new Error("Method not implemented.");
    case "list-projects": {
      const { uri }: { uri: string } = args;
      return await handleListProjects(safeWorkspaceResolve(uri));
    }
    case "list-path-content": {
      const { uri, options }: { uri: string; options?: any } = args;
      return await handleListPathContent(safeWorkspaceResolve(uri), options);
    }
    case "create-project": {
      const { uri }: { uri: string } = args;
      await handleCreateProject(safeWorkspaceResolve(uri));
      return;
    }
    case "delete-project": {
      const { uri }: { uri: string } = args;
      await handleDeleteProject(safeWorkspaceResolve(uri));
      return;
    }
    case "update-project": {
      const {
        uri,
        updatedInfo,
      }: {
        uri: string;
        updatedInfo: {
          name: string;
          ctime?: Date;
        };
      } = args;
      await handleUpdateProject(safeWorkspaceResolve(uri), updatedInfo);
      return;
    }
    case "create-folder": {
      const { uri }: { uri: string } = args;
      await handleCreateFolder(safeWorkspaceResolve(uri));
      return;
    }
    case "create-file": {
      const { uri }: { uri: string } = args;
      await handleCreateFile(safeWorkspaceResolve(uri));
      return;
    }
    case "rename": {
      const { oldUri, newUri }: { oldUri: string; newUri: string } = args;
      await handleRename(
        safeWorkspaceResolve(oldUri),
        safeWorkspaceResolve(newUri),
      );
      return;
    }
    case "delete": {
      const { uri }: { uri: string } = args;
      await handleDelete(safeWorkspaceResolve(uri));
      return;
    }
    case "has-path": {
      const { uri }: { uri: string } = args;
      return await handleHasPath(safeWorkspaceResolve(uri));
    }
    case "read-file": {
      const { uri }: { uri: string } = args;
      return await handleReadFile(safeWorkspaceResolve(uri));
    }
    case "write-file": {
      const { data, uri }: { data: any; uri: string } = args;
      await handleWriteFile(data, safeWorkspaceResolve(uri));
      return;
    }
    case "copy-files": {
      const { from, to }: { from: string; to: string } = args;
      await handleCopyFiles(
        safeWorkspaceResolve(from),
        safeWorkspaceResolve(to),
      );
      return;
    }
    case "get-persistent-settings":
      return handleLoadSettings();
    case "set-persistent-settings": {
      const { settings }: { settings: any } = args;
      await handleSaveSettings(settings);
      return;
    }
    case "get-installation-path":
      return await handleGetInstallationPath();
    case "create-terminal":
      return `wss://${host}/${instanceId}/terminal/ws`;
    default:
      // Do not reflect input data back to the client, return an explicit error message.
      return { error: "Unknown operation" };
  }
}

// List all folders in a path
async function handleListProjects(uri: string) {
  const files = await fs.promises.readdir(uri, { withFileTypes: true });
  const folders = files
    .filter((file) => file.isDirectory())
    .map((file) => file.name)
    .map((projectName) => ({
      name: projectName,
      ctime: fs.statSync(path.join(uri, projectName)).ctime,
    }));

  return folders;
}

async function listPathContent(
  uri: string,
  options: any,
  baseUri: string | undefined = undefined,
) {
  const files = await fs.promises.readdir(uri, { withFileTypes: true });

  const promise: Promise<any>[] = files
    // Filter by file type
    .filter(
      (file) =>
        (options?.include === "folders" && file.isDirectory()) ||
        (options?.include === "files" && file.isFile()) ||
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
      const name = file.name;
      const absoluteUri = path.join(uri, name);
      if (file.isDirectory()) {
        return {
          name: name,
          isFolder: true,
          subDirItems: options.isRecursive
            ? await listPathContent(absoluteUri, options, baseUri ?? uri)
            : [],
          uri: absoluteUri.replace(/\\/g, "/"),
        };
      }

      return {
        name,
        isFolder: false,
        uri: absoluteUri.replace(/\\/g, "/"),
      };
    });

  return Promise.all(promise);
}

// Discover the content of a project
async function handleListPathContent(uri: string, options: any) {
  return await listPathContent(uri, options);
}

async function handleCreateProject(uri: string) {
  // Create a folder at the validated path
  await fs.promises.mkdir(uri, { recursive: true });
}

async function handleDeleteProject(uri: string) {
  // Delete the folder at the validated path
  await fs.promises.rm(uri, { recursive: true, force: true });
}

async function handleUpdateProject(
  uri: string,
  updatedInfo: {
    name: string;
    ctime?: Date;
  },
) {
  // Make sure updatedInfo.name is valid name, not a path
  if (path.basename(updatedInfo.name) !== updatedInfo.name) {
    throw new Error("Invalid project name");
  }

  // Rename the project folder
  const newUri = path.join(path.dirname(uri), updatedInfo.name);
  await fs.promises.rename(uri, newUri);
}

async function handleCreateFolder(uri: string) {
  // Create a folder at the validated path
  await fs.promises.mkdir(uri, { recursive: true });
}

async function handleCreateFile(uri: string) {
  // Create a file at the validated path
  // ensure parent exists
  await fs.promises.mkdir(path.dirname(uri), { recursive: true });
  await fs.promises.writeFile(uri, "");
}

async function handleRename(oldUri: string, newUri: string) {
  await fs.promises.rename(oldUri, newUri);
}

async function handleDelete(uri: string) {
  await fs.promises.rm(uri, {
    recursive: true,
    force: true,
  });
}

async function handleHasPath(uri: string) {
  try {
    return fs.existsSync(uri);
  } catch (err) {
    return false;
  }
}

async function handleReadFile(uri: string) {
  // Read the file at validated path
  const data = await fs.promises.readFile(uri, "utf-8");
  return data;
}

async function handleWriteFile(data: any, uri: string) {
  // Write the data at validated path
  // create parent directory if it doesn't exist
  const dir = path.dirname(uri);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(uri, data);
}

async function handleCopyFiles(from: string, to: string) {
  // Copy the files from the validated from path to the validated to path
  await fs.promises.cp(from, to, { recursive: true });
}

async function handleLoadSettings() {
  if (fs.existsSync(settingsPath)) {
    const data = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(data);
  }
  return {};
}

async function handleSaveSettings(settings: any) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

async function handleGetInstallationPath() {
  const uri = "~/pulse-editor";
  return uri;
}
