<p align="center" style="font-size: 32px;">
Pulse Editor
</p>

> [!IMPORTANT]
> Pulse Editor is still in its early development stage, with a BETA release planned for the end of Q2 2025. Until then, there is no official stable support for extension marketplaces. However, you can explore the platform by developing your own extensions or running our official extensions locally. This is a great opportunity to get an early look at Pulse Editor and start experimenting with its capabilities! See [Extension Development](#pulse-editor-extension-development) below.



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
- [Documentation](#documentation)
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
# Documentation
The documentation will be available at https://docs.pulse-editor.com. You can find documentation repository [here](https://github.com/ClayPulse/docs).

# Getting Started -- User Guide
## Web Client
There is a web deployment at https://editor.claypulse.ai

For detailed web user guide, check out [Web User Guide](web/README.md)
## Mobile Client
Android client is available in release page.
>Current we only support Android, although it is technically possible to have an iOS build (see developer guide below).

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
# For Windows
./node_modules/.bin/electron-rebuild.ps1 -m desktop -v electron_version
# For Linux
./node_modules/.bin/electron-rebuild -m desktop -v electron_version
```
For example, Electron may warn you need NODE_MODULE_VERSION xxx. If you have electron@35.0.2 installed (check desktop/package.json), you can run:
```
./node_modules/.bin/electron-rebuild -m desktop -v 35.0.2
```


## Web Development
Pulse Editor uses Next.js as the frontend (and backend -- TBD). 
You can get started with local development by running: 
```bash
npm run web-dev
```

## Mobile Development
Pulse Editor uses Capacitor.js to create mobile apps on Android and iOS. To develop mobile app locally, run the following:
```bash
# Development with Live Reload. You need to first run a local development server as specified above.
cd mobile
npx cap run android -l --host [your_LAN_server_that_your_phone_can_access]
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
Pulse Editor uses VSCode Webview API to create a VSCode Extension. To develop VScode Extension locally, open the `vscode-extension` in a separate VSCode window. Then press F5 to launch debug task.

Note that you will also need to run the Nextjs server locally during development.

## Pulse Editor Extension Development
Pulse Editor uses [Modular Federation](https://module-federation.io/) to deliver its modular extensions.
For guides on how to start developing and using extensions locally, check out our [React template repository](https://github.com/ClayPulse/pulse-editor-extension-template).

Some of our official extensions are also open-source. Feel free to take examples from them and/or contribute to them.
- [Pulse Editor Code View](https://github.com/ClayPulse/pulse-editor-code-view)
- [Pulse Editor Terminal](https://github.com/ClayPulse/pulse-editor-terminal)