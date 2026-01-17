"use client";

import { getRemote } from "@/lib/module-federation/remote";
import { ExtensionAgent, ExtensionApp } from "@/lib/types";
import { createInstance } from "@module-federation/runtime";
import React, { ReactNode, useContext, useEffect } from "react";
import ReactDOM from "react-dom";
import { Workbox } from "workbox-window";
import { EditorContext } from "./editor-context-provider";

export const mfHost = createInstance({
  name: "pulse_editor",
  remotes: [],
  shared: {
    react: {
      version: "19.2.3",
      scope: "default",
      lib: () => React,
      shareConfig: {
        singleton: true,
        requiredVersion: "19.2.3",
      },
    },
    "react-dom": {
      version: "19.2.3",
      scope: "default",
      lib: () => ReactDOM,
      shareConfig: {
        singleton: true,
        requiredVersion: "19.2.3",
      },
    },
    // Share Workbox configuration as a module
    "workbox-webpack-plugin": {
      shareConfig: {
        singleton: true,
        requiredVersion: "^7.4.0",
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
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      console.log("Registering service worker.");
      const wb = new Workbox("/service-worker.js");
      wb.register();
    }
  }, []);

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
    const trustedDevOrigins = ["http://localhost:3000", window.location.origin];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLLinkElement &&
            !trustedDevOrigins.some((origin) => node.href.startsWith(origin)) &&
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
    function getExtensionAgents(extensions: ExtensionApp[]) {
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

    // Register all extensions
    const extensions = editorContext?.persistSettings?.extensions ?? [];

    const remotes = extensions
      .map((ext) =>
        getRemote(ext.config.id, ext.config.version, ext.remoteOrigin),
      )
      .flat();

    mfHost.registerRemotes(remotes);
    console.log("Registered remotes", remotes);

    // For each extension, load their agents
    const agents = getExtensionAgents(extensions);

    console.log("Loaded agents", agents);

    editorContext?.setPersistSettings((prev) => {
      return {
        ...prev,
        extensionAgents: agents,
      };
    });
  }, [editorContext?.persistSettings?.extensions]);

  return <>{children}</>;
}
