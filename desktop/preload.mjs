const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  selectDir: () => ipcRenderer.invoke("select-dir"),
  selectFile: (fileExtension) =>
    ipcRenderer.invoke("select-file", fileExtension),

  listProjects: (uri) => ipcRenderer.invoke("list-projects", uri),
  listPathContent: (uri, options) =>
    ipcRenderer.invoke("list-path-content", uri, options),

  createProject: (uri) => ipcRenderer.invoke("create-project", uri),
  deleteProject: (uri) => ipcRenderer.invoke("delete-project", uri),
  updateProject: (uri, updatedInfo) => ipcRenderer.invoke("update-project", uri, updatedInfo),

  createFolder: (uri) => ipcRenderer.invoke("create-folder", uri),
  createFile: (uri) => ipcRenderer.invoke("create-file", uri),

  rename: (oldUri, newUri) => ipcRenderer.invoke("rename", oldUri, newUri),
  delete: (uri) => ipcRenderer.invoke("delete", uri),

  hasPath: (path) => ipcRenderer.invoke("has-path", path),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  writeFile: (data, path) => ipcRenderer.invoke("write-file", data, path),

  copyFiles: (from, to) => ipcRenderer.invoke("copy-files", from, to),

  loadSettings: () => ipcRenderer.invoke("load-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),

  getInstallationPath: () => ipcRenderer.invoke("get-installation-path"),

  createTerminal: () => ipcRenderer.invoke("create-terminal"),
});
