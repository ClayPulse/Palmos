"use client";

import { init, registerRemotes } from "@module-federation/runtime";
import React, { useContext, useEffect } from "react";
import { ReactNode } from "react";
import ReactDOM from "react-dom";
import { EditorContext } from "./editor-context-provider";
import { Extension, ExtensionAgent, PEExtensionCommandInfo } from "@/lib/types";

const host = init({
  name: "pulse_editor",
  remotes: [],
  shared: {
    react: {
      version: "19.1.0",
      scope: "default",
      lib: () => React,
      shareConfig: {
        singleton: true,
        requiredVersion: "19.1.0",
      },
    },
    "react-dom": {
      version: "19.1.0",
      scope: "default",
      lib: () => ReactDOM,
      shareConfig: {
        singleton: true,
        requiredVersion: "19.1.0",
      },
    },
    // Share Workbox configuration as a module
    "workbox-webpack-plugin": {
      shareConfig: {
        singleton: true,
        requiredVersion: "^7.3.0",
      },
    },
  },
});

export default function RemoteModuleProvider({
  children,
  isPreventingCSS,
}: {
  children: ReactNode;
  isPreventingCSS: boolean;
}) {
  const editorContext = useContext(EditorContext);

  /* Add service worker to allow offline access to extensions */
  // useEffect(() => {
  //   if ("serviceWorker" in navigator) {
  //     const wb = new Workbox("/service-worker.js");
  //     wb.register();
  //   }
  // }, []);

  useEffect(() => {
    if (!isPreventingCSS) return;

    // Modify the href to point to an empty CSS file
    // to prevent federation module's css from loading
    // into the main app.
    //
    // This is a workaround for the issue where
    // the CSS from the federated module is loaded
    // into the main app and overrides the main app's CSS.

    // TODO: Use mf-manifest.json to get the css file name
    const pattern = /\.css/;
    // CSS from Pulse Editor itself
    const trustedOrigins = ["http://localhost:3000"];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLLinkElement &&
            !trustedOrigins.some((origin) => node.href.startsWith(origin)) &&
            pattern.test(node.href)
          ) {
            console.warn("Removing federated CSS before it loads:", node.href);
            node.href = "/empty.css";
          }
        });
      });
    });

    observer.observe(document.head, { childList: true, subtree: false });

    return () => observer.disconnect();
  }, [isPreventingCSS]);

  useEffect(() => {
    function getExtensionAgents(extensions: Extension[]) {
      const agents: ExtensionAgent[] = extensions.flatMap(
        (ext) =>
          ext.config.agents?.map((agent) => {
            const installedAgent: ExtensionAgent = {
              ...agent,
              author: {
                publisher: ext.config.author ?? "unknown",
                extension: ext.config.displayName,
              },
            };

            return installedAgent;
          }) ?? [],
      );

      return agents;
    }

    function getExtensionCommands(extensions: Extension[]) {
      const commands: PEExtensionCommandInfo[] = extensions.flatMap((ext) => {
        return (
          ext.config.commandsInfoList?.map((command) => {
            const cmdInfo: PEExtensionCommandInfo = {
              ...command,
              // Add the extension id to the command
              moduleId: ext.config.id,
            };

            return cmdInfo;
          }) ?? []
        );
      });

      return commands;
    }

    if (!editorContext) {
      return;
    }

    // Register all extensions
    const extensions = editorContext?.persistSettings?.extensions ?? [];

    const remotes = extensions.map((ext) => {
      return {
        name: ext.config.id,
        entry: `${ext.remoteOrigin}/${ext.config.id}/${ext.config.version}/mf-manifest.json`,
      };
    });

    registerRemotes(remotes);
    console.log("Registered remotes", remotes);

    // For each extension, load their agents
    const agents = getExtensionAgents(extensions);
    // For each extension, load their exposed commands
    const commands = getExtensionCommands(extensions);

    console.log("Loaded agents", agents);
    console.log("Loaded commands", commands);

    editorContext?.setPersistSettings((prev) => {
      return {
        ...prev,
        extensionAgents: agents,
        extensionCommands: commands,
      };
    });
  }, [editorContext?.persistSettings?.extensions]);

  return <>{children}</>;
}
