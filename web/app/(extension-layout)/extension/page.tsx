"use client";

import { mfHost } from "@/components/providers/remote-module-provider";
import { getRemote } from "@/lib/module-federation/remote";
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
      mfHost.registerRemotes(getRemote(moduleId, moduleVersion, remoteOrigin));
      setIsRegistered(true);
    }

    // Load the remote module
    mfHost
      .loadRemote(`${moduleId}/main`)
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

    // Patch fetch for Pulse App backend calling
    const originalFetch = window.fetch;

    const patchedFetch = async (
      ...args: Parameters<typeof fetch>
    ): Promise<Response> => {
      const [resource, config] = args;
      const url =
        resource instanceof Request ? resource.url : resource.toString();

      // Only patch relative URLs (not absolute http/https)
      if (/^https?:\/\//i.test(url)) {
        return originalFetch(resource, config);
      }

      const newUrl = remoteOrigin.startsWith(
        process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.pulse-editor.com",
      )
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/server-function/${moduleId}/${moduleVersion}/${url.replace("/server-function/", "")}`
        : remoteOrigin + url;

      console.log(`[FETCH INTERCEPTED]: ${url} → ${newUrl}`);
      console.log(`[App Info] ID: ${moduleId}, Version: ${moduleVersion}`);

      const response = await originalFetch(newUrl, {
        ...config,
        // Include cookies when url starts with remoteOrigin
        credentials: remoteOrigin.startsWith(
          process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.pulse-editor.com",
        )
          ? "include"
          : config?.credentials,
      });

      if (!response.ok) {
        console.warn(`Fetch Error (${response.status}) for ${url}`);
      }

      return response;
    };

    window.fetch = patchedFetch;
  }, [remoteOrigin, moduleId, moduleVersion, isMounted]);

  if (!isMounted) {
    return null;
  }

  return <div className="h-full w-full">{Ext && <Ext />}</div>;
}
