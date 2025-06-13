# Coding

Pulse Editor Code View is an AI-powered code editor based on CodeMirror 6. Install Pulse Editor Code View from marketplace and get started coding using Pulse Editor today.

:::info **Your Contribution Is Needed!**
Pulse Editor Code is at its early stages — and you can help shape its future.

We're building early extensions and tools to make Pulse Editor more powerful and accessible for everyone. Whether you're passionate about open source, UI/UX, or developer tools, there's a place for you in our community.

👉 Join us, share your ideas, and help make Pulse Editor available to more people around the world.

- [Contribute to Pulse Editor on GitHub](https://github.com/ClayPulse/pulse-editor)
- [Contribute to Pulse Editor Code on GitHub](https://github.com/ClayPulse/pulse-editor-code-view)
- [Join the Community Chat](https://discord.com/invite/s6J54HFxQp)
  :::

## Install Pulse Editor Code View

Click <Icon name="dashboard_customize"/> icon in the toolbar at bottom of screen to browse available extension apps. Search for `Pulse Editor Code View`, then install.

## Create a new source file

:::info
Make sure you have opened a project. To open a project, you can click <Icon name="menu"/> in top navigation bar to open project explorer. Then click on the project that you want to open, or create a new project. See [Manage Projects](http://localhost:3000/docs/guide/quick-start/manage-projects) for more details.
:::

Open the project explorer by clicking <Icon name="menu"/> in top navigation. Now click the <Icon name="note_add" variant="outlined"/> icon to create a new file, then enter file name to create the file.

Once the file is created, you can click it to open. If you want to change its name or delete it, you can right-click or hold (mobile) to open a context menu where you can find these options.

## Open a source file

If your filename's suffixes are registered by the Code View extension, Pulse Editor Code View should load upon opening the file.

You can find a list of [supported file suffixes](https://github.com/ClayPulse/pulse-editor-code-view/blob/main/pulse.config.ts#L21) and [supported programming languages](https://github.com/ClayPulse/pulse-editor-code-view/blob/main/src/lib/codemirror-extensions/get-language-extension.ts) in our [Pulse Editor Code View repository](https://github.com/ClayPulse/pulse-editor-code-view).

## Start coding

Now you can enjoy coding with Pulse Editor Code View. Pulse Editor Code View comes with the following AI features:

### Using code completion

You can use code completion just similar to code copilot from VSCode by entering some preceding text, then Code View will call a code agent to autocomplete the following line(s) for you. When you see grayed out text prediction, simply press `tab` to accept on desktop, or `swipe right` to accept on mobile.

### Using code agent command

The Code View extensions exposes a command that calls code agents to modify code file. This means you can call this command via typing it out (WIP), or Pulse Editor Creative Assistant can call this command on your behalf.

- To run this command yourself (WIP)  
  (WIP)
- To let Pulse Editor Creative Assistant to call it on your behalf
  - Via voice chat: You can click <Icon name="mic" /> to chat with Creative Assistant using voice
  - Via chatbot interface (WIP):

## Run program in terminal

Pulse Editor Terminal is a separate extension that you can install from the marketplace. This enables you to run terminal on desktop or mobile (Android only). The desktop terminal should open automatically once the extension is installed and terminal console is opened. For mobile, see [Pulse Editor Terminal guide](https://github.com/ClayPulse/pulse-editor-terminal).

:::info
We are working hard to support web development environment. Stay tuned!
:::
