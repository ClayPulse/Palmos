<h1 align="center">
Pulse Editor
</h1>

Pulse Editor is a modular, cross-platform, AI-powered productivity platform with federated app collaboration and extensible workflows.

> [!IMPORTANT]
> 🎉🎉Pulse Editor is now in beta 2. And we won a hackathon! Read more [here](#major-beta-release-2-we-are-here).
>
> Pulse Editor is still in its early development stage. We are trying hard to make sure everything works as expected for all different platforms. See [Beta Release Roadmap](#beta-release-roadmap) below.

<p align="center">
  <img alt="Pulse Editor" src="shared-assets/icons/pulse_logo.svg"/>
</p>

<div align="center">

[![Static Badge](https://img.shields.io/badge/docs-8A2BE2?style=for-the-badge)](https://docs.pulse-editor.com)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/s6J54HFxQp)
[![Licence](https://img.shields.io/github/license/Ileriayo/markdown-badges?style=for-the-badge)](./LICENSE)

</div>

# Features

## Cross-platform full-stack apps collaboration workflow

By leveraging [Module Federation](https://module-federation.io/),
Pulse Editor allows federated app collaboration and extensible workflows with AI agents on all platform.

Pulse Editor is not just another drag-and-drop backend automation tool, it is a full-stack automation platform -- a true app OS that unifies both frontend and backend in one visual environment.

<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://cdn.pulse-editor.com/assets/App_Collaboration2.gif" alt="Demo2" width="100%">
      <p>Full-stack app node (e.g. <a href="https://github.com/OpenCut-app/OpenCut">OpenCut</a>)</p>
    </td>
    <td align="center" width="50%">
      <img src="https://cdn.pulse-editor.com/assets/App_Collaboration1.gif" alt="Demo1" width="100%">
      <p>Full-stack app workflow</p>
    </td>
  </tr>
</table>

# Use Cases

## 1. Vibe Coding

Running vibe coding workflow in canvas view allows you to develop software on any device, with help of vibe coding agent.

### Dev Server Live preview

![VibeCoding_LivePrevew](https://cdn.pulse-editor.com/assets/VibeCode_LivePreview.gif)

### Vibe Coding agent -- terminal control

![VibeCoding_TerminalControl](https://cdn.pulse-editor.com/assets/VibeCode_TerminalControlAgent.gif)

### Vibe Coding agent -- code modification

![VibeCoding_CodeEditorControl](https://cdn.pulse-editor.com/assets/VibeCode_CodeEditorControlAgent.gif)

## 2. Serverless ComfyUI Image/Video Generation (WIP)

You can run workflows with [Pulse App ComfyUI Workflow](https://github.com/Shellishack/pulse-app-comfyui-workflow).

## 3. Video Editing (WIP)

## Remote or local workspace

With Pulse Editor, you can manage your file system within interface.

On desktop, you can choose to open workspace in either local storage or remote container.

On web/mobile, you will
have to start a [remote workspace](#start-a-remote-workspace) first.

### Start a remote workspace

1. Create a new project or select a project <br/>
   **Create project:**
   ![Workspace_CreateProject](https://cdn.pulse-editor.com/assets/Workspace_CreateProject.gif)
   **Select project:**
   ![Workspace_SelectProject](https://cdn.pulse-editor.com/assets/Workspace_SelectProject.gif)
2. Create a new workspace or select a workspace <br/>
   **Create workspace:**
   ![Workspace_CreateWorkspace](https://cdn.pulse-editor.com/assets/Workspace_CreateWorkspace.gif)
   **Select workspace:**
   ![Workspace_CreateWorkspace](https://cdn.pulse-editor.com/assets/Workspace_SelectWorkspace.gif)

### Create file in workspace

![Workspace_CreateFile](https://cdn.pulse-editor.com/assets/Workspace_CreateFile.gif)

### Send file to app node

![Workspace_OpenFile](https://cdn.pulse-editor.com/assets/Workspace_OpenFile.gif)

### Open and interact with workspace terminal

![Workspace_CreateTerminalInWorkspace](https://cdn.pulse-editor.com/assets/Workspace_CreateTerminalInWorkspace.gif)

# Beta Release Roadmap

🎉🎉Pulse Editor is now in beta 2.

We plan to have 2-3 major beta release stages before we reach a stable release version.

### Major Beta Release 1 (June 2025):

Pulse Editor is now available on Android and Desktop (tested for Windows, needs more testing for Linux and MacOS).

Pulse Editor Marketplace now is available for editor users. Simply download Pulse Editor, and view all available extensions in the extension page. You can also browser and search extensions in [Marketplace Web (WIP)](https://pulse-editor.com/marketplace). As for now, the following extensions are available:

- (Official) [Pulse Editor Code View (MIT)](https://github.com/ClayPulse/pulse-editor-code-view)
- (Official) [Pulse Editor Terminal (MIT)](https://github.com/ClayPulse/pulse-editor-terminal)
- (Official) [Pulse Editor Image Editor (MIT)](https://github.com/Shellishack/pulse-editor-image-editor)
- (Official) [Pulse Editor Video Editor (MIT)](https://github.com/Shellishack/pulse-editor-video-editor)

Pulse Editor Marketplace Developer Access is now open for application. If you'd like to develop and publish your own extensions to Pulse Editor Marketplace, submit a form here [Developer Beta Access](https://pulse-editor.com/beta).

Even if you haven't got access to publish your extensions to the marketplace, you can still explore Pulse Editor platform by developing your own extensions locally. This is a great opportunity to get an early look at Pulse Editor and start experimenting with its capabilities! See [Extension Development](#pulse-editor-extension-development) below.

### Major Beta Release 2 (we are here)

Pulse Editor beta 2 is now out. Many changes are added in this new release. And, Pulse Editor won a hackathon! Big thanks to AI Hacker House in Shanghai for the hackathon opportunity for me to showcase this project in front of dozens of AI product enthusiasts and entrepreneurs!

What's new in this release:

1. Support frontend and backend module federation to allow developers to publish full-stack apps on Pulse Editor platform.
2. Add workflow canvas to allow collaboration among community full-stack apps.
3. Introduce Pulse Editor cloud platform. With the cloud platform, you can start remote dev container and use it to run automation workflows.
4. Support web editor. Check it out at https://web.pulse-editor.com.
5. Publish mobile app to Google Play (in-progress).
6. Allow users to publish workflows to marketplace.
7. Introduce Pulse Editor platform AI assistants. With the platform AI assistant, you can create productivity workflow effortless via chatting. The platform AI assistant will suggest best fitted apps for you requirements and execute the workflow on your behalf.
8. Updates to npm packages, cli tool, and [Pulse app full-stack React template](https://github.com/claypulse/pulse-app-template).

### Major Beta Release 3 (planned for 2026 Q1)

Planned items:

- More AI features
- MacOS & Linux & iOS support
- Marketplace payment system (allow extension app developers to monetize)
- More official workflows
- More to be announced!

# Documentation and Guide

The documentation and user guide will be available at https://docs.pulse-editor.com. For documentation contributors, the docs source repository is located [here](docs/).

# Getting Started -- User Guide

## Web Client

There is a web deployment at https://web.pulse-editor.com

## Mobile Client

Android client is available in release page.

> Current we only support Android, although it is technically possible to have an iOS build (see developer guide below).

For detailed mobile user guide, check out [Mobile User Guide](mobile/README.md)

## Desktop Client

Linux, MacOS, Windows clients are available in release page.

> [!NOTE]
> Only Windows is tested in beta release.

For detailed desktop user guide, check out [Desktop User Guide](desktop/README.md)

## VSCode Extension (deprecated)

A VSCode Webview Extension with limited features is available [here](https://marketplace.visualstudio.com/items?itemName=shellishack.pulse-editor).

For detailed VSCode extension user guide, check out [VSCode Extension User Guide](vscode-extension/README.md)

# Getting Started -- Development Guide

## Recommended Nodejs version

Nodejs 20

## Install dependencies

You can install dependencies for all workspaces using

```
npm i
```

Or, for a specific workspace. e.g. for web:

```
npm i --workspace=web
```

## Install dependencies (desktop native modules)

When dependencies in `desktop/`, use Electron's nodejs instead of local nodejs.

Make sure you have installed necessary build tools.

### For Windows

Nodejs Windows Installer should already include windows-build-tools. In addition, make sure [Windows SDK](https://developer.microsoft.com/en-us/windows/downloads/windows-10-sdk) is also available:

### For Linux

```
sudo apt install -y make python build-essential
```

Then you can rebuild native dependencies in `desktop/` using.

```
cd desktop
npm run rebuild-native
```

Electron may warn you need NODE_MODULE_VERSION xxx. If you have electron@35.0.2 installed (check desktop/package.json), you can run:

```
electron-rebuild -v 35.0.2
```

Start development:

```
npm run desktop-dev
```

Build production release:

```
npm run desktop-build
```

## Web Development

Pulse Editor uses Next.js as the frontend (and backend -- TBD).
You can get started with local development by running:

```bash
npm run web-dev
```

## Mobile Development

Pulse Editor uses Capacitor.js to create mobile apps on Android and iOS. To develop mobile app locally, try the following.

Start development:

```
npm run android-dev
```

Build production release

```bash
# Production
npm run android-build
```

## Desktop Development

Pulse Editor uses Electron.js to create desktop apps on Windows, Mac and Linux. To develop desktop app locally,
run:

```bash
# Development
npm run desktop-dev
# Production
npm run desktop-build
```

If you run `npm run desktop-build` for a production build, you can find an executable file inside `build/desktop`.

## VSCode Extension Development

> [!warning]
> The code in `vscode-extension` might be out of date, as it was made for an Alpha Demo.  
> Support for using Pulse Editor as an extension in VSCode might be discontinued, or get simply replaced with a webview.

Pulse Editor uses VSCode Webview API to create a VSCode Extension. To develop VScode Extension locally, open the `vscode-extension` in a separate VSCode window. Then press F5 to launch debug task.

Note that you will also need to run the Nextjs server locally during development.

## Pulse Editor App Development

Pulse Editor uses [Modular Federation](https://module-federation.io/) to deliver its modular extensions.
For guides on how to start developing and using extensions locally, check out our [React template repository](https://github.com/ClayPulse/pulse-editor-extension-template).

Some of our official extensions are also open-source. Feel free to take examples from them and/or contribute to them.

- [Pulse Editor Code View](https://github.com/ClayPulse/pulse-editor-code-view)
- [Pulse Editor Terminal](https://github.com/ClayPulse/pulse-editor-terminal)

## Pulse Editor NPM libraries development

### Versioning

Use changeset to version each release of npm library.

Enter/Exit prerelease

```bash
npx changeset pre enter alpha
npx changeset pre exit
```

Add a new version

```bash
npx changeset
```

Commit the new version

```bash
npx changeset version
```

Publish npm libraries

```bash
# Run build before publishing
npm run shared-utils-build && npm run react-api-build
npx changeset publish
```

For developing main client and using recently modified npm libraries without publishing, you can change web/package.json to have the following:

```json
"@pulse-editor/shared-utils": "../npm-packages/shared-utils",
```

Make sure to change back if using published versions.
