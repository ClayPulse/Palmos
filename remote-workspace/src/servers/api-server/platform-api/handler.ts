import fs from "fs";
import ignore from "ignore";
import path from "path";

// Define a safe root directory for projects. Can be overridden by env or configured as needed.
// All incoming URIs will be resolved and validated to ensure they don't escape this root.

const appRoot = "/pulse-editor";

const workspaceRoot = "/workspace";

const settingsPath = path.join(appRoot, "settings.json");

function safeWorkspaceResolve(uri: string): string {
  if (!uri || typeof uri !== "string") {
    throw new Error("Invalid path");
  }

  // Canonicalize the workspaceRoot once for this function
  const rootPath = path.resolve(workspaceRoot);
  // Combine and normalize the user input relative to the safe root
  const candidate = path.resolve(uri);

  // Check that candidate is strictly under rootPath (or equal to rootPath)
  const rel = path.relative(rootPath, candidate);
  // Allow if candidate is rootPath itself, or a subpath (not escaping via '..', not absolute)
  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
    return candidate;
  }

  throw new Error("Can only access paths within the project home directory.");
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
      return await handleListProjects(uri);
    }
    case "list-path-content": {
      const { uri, options }: { uri: string; options?: any } = args;
      return await handleListPathContent(uri, options);
    }
    case "create-project": {
      const { uri }: { uri: string } = args;
      await handleCreateProject(uri);
      return;
    }
    case "delete-project": {
      const { uri }: { uri: string } = args;
      await handleDeleteProject(uri);
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
      await handleUpdateProject(uri, updatedInfo);
      return;
    }
    case "create-folder": {
      const { uri }: { uri: string } = args;
      await handleCreateFolder(uri);
      return;
    }
    case "create-file": {
      const { uri }: { uri: string } = args;
      await handleCreateFile(uri);
      return;
    }
    case "rename": {
      const { oldUri, newUri }: { oldUri: string; newUri: string } = args;
      await handleRename(oldUri, newUri);
      return;
    }
    case "delete": {
      const { uri }: { uri: string } = args;
      await handleDelete(uri);
      return;
    }
    case "has-path": {
      const { uri }: { uri: string } = args;
      return await handleHasPath(uri);
    }
    case "read-file": {
      const { uri }: { uri: string } = args;
      return await handleReadFile(uri);
    }
    case "write-file": {
      const { data, uri }: { data: any; uri: string } = args;
      await handleWriteFile(data, uri);
      return;
    }
    case "copy-files": {
      const { from, to }: { from: string; to: string } = args;
      await handleCopyFiles(from, to);
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
  const rootPath = safeWorkspaceResolve(uri);
  const files = await fs.promises.readdir(rootPath, { withFileTypes: true });
  const folders = files
    .filter((file) => file.isDirectory())
    .map((file) => file.name)
    .map((projectName) => ({
      name: projectName,
      ctime: fs.statSync(path.join(rootPath, projectName)).ctime,
    }));

  return folders;
}

async function listPathContent(
  uri: string,
  options: any,
  baseUri: string | undefined = undefined,
) {
  const rootPath = safeWorkspaceResolve(uri);
  const files = await fs.promises.readdir(rootPath, { withFileTypes: true });

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
      const absoluteUri = path.join(rootPath, name);
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
  const safe = safeWorkspaceResolve(uri);
  await fs.promises.mkdir(safe, { recursive: true });
}

async function handleDeleteProject(uri: string) {
  // Delete the folder at the validated path
  const safe = safeWorkspaceResolve(uri);
  await fs.promises.rm(safe, { recursive: true, force: true });
}

async function handleUpdateProject(
  uri: string,
  updatedInfo: {
    name: string;
    ctime?: Date;
  },
) {
  const safeOld = safeWorkspaceResolve(uri);
  const newPathCandidate = path.join(path.dirname(safeOld), updatedInfo.name);
  const safeNew = safeWorkspaceResolve(newPathCandidate);
  await fs.promises.rename(safeOld, safeNew);
}

async function handleCreateFolder(uri: string) {
  // Create a folder at the validated path
  const safe = safeWorkspaceResolve(uri);
  await fs.promises.mkdir(safe, { recursive: true });
}

async function handleCreateFile(uri: string) {
  // Create a file at the validated path
  const safe = safeWorkspaceResolve(uri);
  // ensure parent exists
  await fs.promises.mkdir(path.dirname(safe), { recursive: true });
  await fs.promises.writeFile(safe, "");
}

async function handleRename(oldUri: string, newUri: string) {
  const safeOld = safeWorkspaceResolve(oldUri);
  const safeNew = safeWorkspaceResolve(newUri);
  await fs.promises.rename(safeOld, safeNew);
}

async function handleDelete(uri: string) {
  const safe = safeWorkspaceResolve(uri);
  await fs.promises.rm(safe, {
    recursive: true,
    force: true,
  });
}

async function handleHasPath(uri: string) {
  try {
    const safe = safeWorkspaceResolve(uri);
    return fs.existsSync(safe);
  } catch (err) {
    return false;
  }
}

async function handleReadFile(uri: string) {
  // Read the file at validated path
  const safe = safeWorkspaceResolve(uri);
  const data = await fs.promises.readFile(safe, "utf-8");
  return data;
}

async function handleWriteFile(data: any, uri: string) {
  // Write the data at validated path
  const safePath = safeWorkspaceResolve(uri);
  // create parent directory if it doesn't exist
  const dir = path.dirname(safePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(safePath, data);
}

async function handleCopyFiles(from: string, to: string) {
  // Copy the files from the validated from path to the validated to path
  const safeFrom = safeWorkspaceResolve(from);
  const safeTo = safeWorkspaceResolve(to);
  await fs.promises.cp(safeFrom, safeTo, { recursive: true });
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
