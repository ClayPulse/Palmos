<h1 align="center">
Pulse Editor
</h1>

> [!IMPORTANT]
> Pulse Editor is still in its early development stage. We are trying hard to make sure everything works as expected for all different platforms. See [Beta Release Roadmap](#beta-release-roadmap) below.

<p align="center">
  <img alt="Pulse Editor" src="shared-assets/icons/pulse_logo.svg"/>
</p>

<div align="center">

[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/s6J54HFxQp)
[![Licence](https://img.shields.io/github/license/Ileriayo/markdown-badges?style=for-the-badge)](./LICENSE)

</div>

# Table of Contents

<span style="font-size: 16px;">

- [Table of Contents](#table-of-contents)
- [Introduction](#introduction)
- [Beta Release Roadmap](#beta-release-roadmap)
    - [Major Beta Release 1 (June 2025):](#major-beta-release-1-june-2025)
    - [Major Beta Release 2 (planned for 2025 Q3)](#major-beta-release-2-planned-for-2025-q3)
    - [Major Beta Release 3 (planned for 2025 Q4)](#major-beta-release-3-planned-for-2025-q4)
- [Documentation and Guide](#documentation-and-guide)
- [Getting Started -- User Guide](#getting-started----user-guide)
  - [Web Client](#web-client)
  - [Mobile Client](#mobile-client)
  - [Desktop Client](#desktop-client)
  - [VSCode Extension](#vscode-extension)
- [Getting Started -- Development Guide](#getting-started----development-guide)
  - [Recommended Nodejs version](#recommended-nodejs-version)
  - [Install dependencies](#install-dependencies)
  - [Install dependencies (desktop native modules)](#install-dependencies-desktop-native-modules)
    - [For Windows](#for-windows)
    - [For Linux](#for-linux)
  - [Web Development](#web-development)
  - [Mobile Development](#mobile-development)
  - [Desktop Development](#desktop-development)
  - [VSCode Extension Development](#vscode-extension-development)
  - [Pulse Editor Extension Development](#pulse-editor-extension-development)

</span>

# Introduction

Pulse Editor is a cross-platform tool built to make AI-powered creation and development feel intuitive and seamless.

# Beta Release Roadmap

🎉🎉Pulse Editor is now in beta.

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

### Major Beta Release 2 (planned for 2025 Q3)

Planned items:

- Documentation
- Support for web
- Support remote Pulse Editor instance access
- Extension app AI builder
- ... (WIP)

~~Coming Soon: [Making 100 Extension Apps Challenge](https://github.com/shellishack)~~

### Major Beta Release 3 (planned for 2025 Q4)

... (WIP)

# Documentation and Guide

The documentation and user guide will be available at https://docs.pulse-editor.com. For documentation contributors, the docs source repository is located [here](docs/).

# Getting Started -- User Guide

## Web Client

There is a web deployment at https://web.pulse-editor.com

For detailed web user guide, check out [Web User Guide](web/README.md)

## Mobile Client

Android client is available in release page.

> Current we only support Android, although it is technically possible to have an iOS build (see developer guide below).

For detailed mobile user guide, check out [Mobile User Guide](mobile/README.md)

## Desktop Client

Linux, MacOS, Windows clients are available in release page.

> [!NOTE]
> Only Windows is tested in alpha release.

For detailed desktop user guide, check out [Desktop User Guide](desktop/README.md)

## VSCode Extension

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

## Pulse Editor Extension Development

Pulse Editor uses [Modular Federation](https://module-federation.io/) to deliver its modular extensions.
For guides on how to start developing and using extensions locally, check out our [React template repository](https://github.com/ClayPulse/pulse-editor-extension-template).

Some of our official extensions are also open-source. Feel free to take examples from them and/or contribute to them.

- [Pulse Editor Code View](https://github.com/ClayPulse/pulse-editor-code-view)
- [Pulse Editor Terminal](https://github.com/ClayPulse/pulse-editor-terminal)
