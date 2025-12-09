import { app, BrowserWindow, dialog, ipcMain, session } from "electron";
import serve from "electron-serve";
import path from "path";
import { fileURLToPath } from "url";

import fs from "fs";
import ignore from "ignore";
import { createTerminalServer } from "./lib/node-pty-server.js";

// Change path to "Pulse Editor"
app.setName("Pulse Editor");
app.setPath(
  "userData",
  app.getPath("userData").replace("pulse-editor-desktop", "Pulse Editor"),
);

// Get the file path of the current module
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current module
const __dirname = path.dirname(__filename);

// Settings
const userDataPath = app.getPath("userData");
const settingsPath = path.join(userDataPath, "settings.json");

const appServe = serve({
  directory: path.join(process.resourcesPath, "next"),
});

serve({
  directory: path.join(process.resourcesPath, "next"),
  file: "extension",
  scheme: "extension",
});

let mainWindow = null;
let sharedSession = null;
let terminalServer = null;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      session: sharedSession,
    },
    titleBarOverlay: {
      color: "#00000000",
      symbolColor: "#74b1be",
    },
    icon: path.join(__dirname, "../shared-assets/icons/electron/pulse_editor"),
  });
  mainWindow = win;

  win.menuBarVisible = false;

  // Production launch
  if (app.isPackaged) {
    appServe(win).then(() => {
      win.loadURL("app://-");
    });
  }
  // Development launch
  else {
    // Choose either http or https by trying both
    if (process.env.HTTPS === "true") {
      app.commandLine.appendSwitch("allow-insecure-localhost", "true");
      app.commandLine.appendSwitch("ignore-certificate-errors", "true");

      win.loadURL("https://localhost:3000");
    } else {
      win.loadURL("http://localhost:3000");
    }

    win.webContents.openDevTools();
    win.webContents.on("did-fail-load", (e, code, desc) => {
      win.webContents.reloadIgnoringCache();
    });
  }

  ipcMain.on("set-title", handleSetTitle);
}

function handleSetTitle(event, title) {
  console.log("Setting title:", title);
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  win.setTitle(title);
}

async function handleSelectDir(event) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (!canceled) {
    return filePaths[0].replace(/\\/g, "/");
  }
}

async function handleSelectFile(event, fileExtension) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters:
      fileExtension === ""
        ? []
        : [
            {
              name: fileExtension + " files",
              extensions: [fileExtension],
            },
          ],
  });

  if (!canceled) {
    const uri = filePaths[0];

    return await fs.promises.readFile(uri);
  }
}

// List all folders in a path
async function handleListProjects(event, uri) {
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

async function listPathContent(uri, options, baseUri = undefined) {
  const files = await fs.promises.readdir(uri, { withFileTypes: true });

  // Determine if we should recurse based on depth or isRecursive
  const shouldRecurse =
    options.isRecursive || (options.depth !== undefined && options.depth > 0);

  const promise = files
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
          subDirItems: shouldRecurse
            ? await listPathContent(
                absoluteUri,
                {
                  ...options,
                  depth:
                    options.depth !== undefined && options.depth > 0
                      ? options.depth - 1
                      : undefined,
                },
                baseUri ?? uri,
              )
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

async function handleRename(event, oldUri, newUri) {
  await fs.promises.rename(oldUri, newUri);
}

async function handleDelete(event, uri) {
  await fs.promises.rm(uri, { recursive: true, force: true });
}

async function handleCreateProject(event, uri) {
  // Create a folder at the uri
  await fs.promises.mkdir(uri);
}

async function handleDeleteProject(event, uri) {
  await fs.promises.rm(uri, { recursive: true, force: true });
}

async function handleUpdateProject(event, uri, updatedInfo) {
  const newUri = path.join(path.dirname(uri), updatedInfo.name);
  await fs.promises.rename(uri, newUri);
}

async function handleCreateFolder(event, uri) {
  // Create a folder at the uri
  await fs.promises.mkdir(uri);
}

async function handleCreateFile(event, uri) {
  // Create a file at the uri
  await fs.promises.writeFile(uri, "");
}

// Discover the content of a project
async function handleListPathContent(event, uri, options) {
  return await listPathContent(uri, options);
}

async function handleHasPath(event, path) {
  return fs.existsSync(path);
}

async function handleReadFile(event, path) {
  // Read the file at path
  const data = await fs.promises.readFile(path, "utf-8");

  return data;
}

async function handleWriteFile(event, data, path) {
  // Write the data at path
  // await fs.promises.writeFile(path, data);
  // create path if it doesn't exist
  const dir = path.split("/").slice(0, -1).join("/");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path, data);
}

async function handleCopyFiles(event, from, to) {
  // Copy the files from the from path to the to path
  await fs.promises.cp(from, to, { recursive: true });
}

function handleSaveSettings(event, settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function handleLoadSettings(event) {
  if (fs.existsSync(settingsPath)) {
    const data = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(data);
  }
  return {};
}

function handleGetInstallationPath(event) {
  // Return the installation path if the app is packaged
  if (app.isPackaged) {
    return app.getAppPath();
  }
  // Return the parent directory of the app if the app is in development mode
  const uri = path.join(app.getAppPath(), "..");
  return uri;
}

async function handleLogin(event) {
  const cookieName = "pulse-editor.session-token";

  // Use the default session so cookies are shared automatically
  const loginWindow = new BrowserWindow({
    width: 600,
    height: 700,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // login window and main window will automatically share cookies — no manual copying needed:
      session: sharedSession, // ← important
    },
  });

  const signinUrl = app.isPackaged
    ? "https://pulse-editor.com/api/auth/signin"
    : "https://localhost:8080/api/auth/signin";
  await loginWindow.loadURL(signinUrl);

  const loginSession = loginWindow.webContents.session;

  // clear login window cookies before starting login
  await clearLoginCookies(loginSession);

  const interval = setInterval(async () => {
    try {
      const cookies = await sharedSession.cookies.get({ name: cookieName });

      // If the cookie is present, reload the main window to reflect logged-in state
      if (cookies.length > 0) {
        clearInterval(interval);

        mainWindow.reload();

        // Check if cookies are present in the main window session
        const mainCookies = await sharedSession.cookies.get({
          name: cookieName,
        });

        // Login successful
        loginWindow.close();
        console.log(`Login successful, cookie "${cookieName}" present.`);
      }
    } catch (err) {
      console.error("Error checking cookie:", err);
    }
  }, 1000);
}

async function handleLogout() {
  try {
    await clearLoginCookies(sharedSession);

    // Reload main window
    if (mainWindow) {
      mainWindow.reload();
    }

    // Return success to renderer
    return { success: true };
  } catch (err) {
    console.error("Error during logout:", err);
    return { success: false, error: err.message };
  }
}

async function clearLoginCookies(currentSession) {
  // await currentSession.clearStorageData({ storages: ["cookies"] });

  const cookieName = "pulse-editor.session-token";

  const cookies = await currentSession.cookies.get({
    name: cookieName,
  });

  for (const cookie of cookies) {
    // Determine the scheme (secure cookies use https)
    const protocol = cookie.secure ? "https://" : "http://";

    // Build the URL using domain and path
    // Note: cookie.domain may start with a leading dot, remove it
    const domain = cookie.domain.startsWith(".")
      ? cookie.domain.slice(1)
      : cookie.domain;

    const url = `${protocol}${domain}${cookie.path}`;
    await currentSession.cookies.remove(url, cookie.name);
  }
}

let isCreatedTerminal = false;
function handleCreateTerminal(event) {
  if (!isCreatedTerminal) {
    terminalServer = createTerminalServer();
    isCreatedTerminal = true;
  }

  return "ws://localhost:6060";
}

app.whenReady().then(() => {
  sharedSession = session.defaultSession;
  console.log("Shared session path:", sharedSession.storagePath);

  ipcMain.handle("select-dir", handleSelectDir);
  ipcMain.handle("select-file", handleSelectFile);

  ipcMain.handle("list-projects", handleListProjects);
  ipcMain.handle("list-path-content", handleListPathContent);

  ipcMain.handle("create-project", handleCreateProject);
  ipcMain.handle("delete-project", handleDeleteProject);
  ipcMain.handle("update-project", handleUpdateProject);

  ipcMain.handle("create-folder", handleCreateFolder);
  ipcMain.handle("create-file", handleCreateFile);

  ipcMain.handle("rename", handleRename);
  ipcMain.handle("delete", handleDelete);

  ipcMain.handle("has-path", handleHasPath);
  ipcMain.handle("read-file", handleReadFile);
  ipcMain.handle("write-file", handleWriteFile);

  ipcMain.handle("copy-files", handleCopyFiles);

  ipcMain.handle("get-persistent-settings", handleLoadSettings);
  ipcMain.handle("set-persistent-settings", handleSaveSettings);

  ipcMain.handle("get-installation-path", handleGetInstallationPath);

  ipcMain.handle("create-terminal", handleCreateTerminal);

  ipcMain.handle("login", handleLogin);
  ipcMain.handle("logout", handleLogout);

  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }

  // Close terminal server if running
  if (isCreatedTerminal) {
    terminalServer.close();
  }
});
