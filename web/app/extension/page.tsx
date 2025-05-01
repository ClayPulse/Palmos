"use client";

import RemoteExtensionProvider from "@/components/providers/remote-extension-provider";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ExtensionPage({}) {
  const params = useSearchParams();
  const remoteOrigin = params.get("remoteOrigin");
  const moduleId = params.get("moduleId");
  const moduleVersion = params.get("moduleVersion");
  const viewId = params.get("viewId");

  const [Ext, setExt] = useState<any | null>(null);

  const [isRegistered, setIsRegistered] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (isLoaded) return;

    if (!remoteOrigin || !moduleId || !moduleVersion || !viewId) {
      console.error(
        "Missing required parameters: remoteOrigin, moduleId, moduleVersion, viewId",
      );
      return;
    }

    // @ts-expect-error View id is assigned to window object
    window.viewId = viewId;

    if (!isRegistered) {
      registerRemotes([
        {
          name: moduleId,
          entry: `${remoteOrigin}/${moduleId}/${moduleVersion}/mf-manifest.json`,
        },
      ]);
      setIsRegistered(true);
    }

    loadRemote(`${moduleId}/main`)
      .then((module) => {
        console.log("Loaded remote module:", moduleId, module);

        // @ts-expect-error Types are not available since @module-federation/enhanced
        // cannot work in Nextjs App router. Hence types are not generated.
        const { default: LoadedExtension, Config } = module;

        setExt(() => LoadedExtension);
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading remote module:", error);
      });
  }, [remoteOrigin, moduleId, moduleVersion, isMounted]);

  if (!isMounted) {
    return null;
  }

  return <div className="h-full w-full">{Ext && <Ext />}</div>;
}
