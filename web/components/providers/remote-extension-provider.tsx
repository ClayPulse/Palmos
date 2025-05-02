"use client";

import { init, registerRemotes } from "@module-federation/runtime";
import React, { useContext, useEffect } from "react";
import { ReactNode } from "react";
import ReactDOM from "react-dom";
import { EditorContext } from "./editor-context-provider";

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

export default function RemoteExtensionProvider({
  children,
}: {
  children: ReactNode;
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
    // Register all extensions
    const extensions = editorContext?.persistSettings?.extensions ?? [];
    if (extensions.length > 0) {
      const remotes = extensions.map((ext) => {
        return {
          name: ext.config.id,
          entry: `${ext.remoteOrigin}/${ext.config.id}/${ext.config.version}/mf-manifest.json`,
        };
      });

      registerRemotes(remotes);
      console.log("Registered remotes", remotes);
    }
  }, [editorContext?.persistSettings?.extensions]);

  return <>{children}</>;
}
