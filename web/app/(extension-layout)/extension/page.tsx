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
    async function loadExtension() {
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
        mfHost.registerRemotes(
          getRemote(moduleId, moduleVersion, remoteOrigin),
        );
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

      // -------------------
      // Patch fetch for API calls
      // -------------------
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

        const expectedCdnOrigin =
          process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.pulse-editor.com";

        let isCdnOrigin = false;
        try {
          const parsedRemote = new URL(remoteOrigin);
          const parsedExpected = new URL(expectedCdnOrigin);
          isCdnOrigin = parsedRemote.origin === parsedExpected.origin;
        } catch {
          isCdnOrigin = false;
        }

        const newUrl = isCdnOrigin
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/server-function/${moduleId}/${moduleVersion}/${url.replace("/server-function/", "")}`
          : remoteOrigin + url;

        console.log(`[FETCH INTERCEPTED]: ${url} → ${newUrl}`);
        console.log(`[App Info] ID: ${moduleId}, Version: ${moduleVersion}`);

        const response = await originalFetch(newUrl, {
          ...config,
          // Include cookies only when remoteOrigin matches the configured CDN origin
          credentials: isCdnOrigin ? "include" : config?.credentials,
        });

        if (!response.ok) {
          console.warn(`Fetch Error (${response.status}) for ${url}`);
        }

        return response;
      };

      window.fetch = patchedFetch;

      // -------------------
      // Patch DOM resources to CDN
      // -------------------
      const cdnBase =
        process.env.NEXT_PUBLIC_CDN_URL ?? "https://cdn.pulse-editor.com";
      const storageContainer = process.env.NEXT_PUBLIC_STORAGE_CONTAINER;

      const patchResources = () => {
        document
          .querySelectorAll<HTMLElement>("[src^='/'], [href^='/']")
          .forEach((el) => {
            if (
              el.tagName === "IMG" ||
              el.tagName === "VIDEO" ||
              el.tagName === "AUDIO"
            ) {
              const src = el.getAttribute("src");
              if (src && src.startsWith("/")) {
                el.setAttribute(
                  "src",
                  `${cdnBase}/${storageContainer}/${moduleId}/${moduleVersion}/client${src}`,
                );

                console.log(
                  `[RESOURCE PATCHED]: ${src} → ${el.getAttribute("src")}`,
                );
              }
            } else if (el.tagName === "LINK" || el.tagName === "SCRIPT") {
              const attr = el.tagName === "LINK" ? "href" : "src";
              const val = el.getAttribute(attr);
              if (val && val.startsWith("/")) {
                el.setAttribute(attr, `${cdnBase}${val}`);

                console.log(
                  `[RESOURCE PATCHED]: ${val} → ${el.getAttribute(attr)}`,
                );
              }
            }
          });
      };

      // Patch immediately
      patchResources();

      // Observe for dynamically added elements
      const observer = new MutationObserver(patchResources);
      observer.observe(document.body, { childList: true, subtree: true });

      // Clean up observer on unmount
      return () => observer.disconnect();
    }

    loadExtension();
  }, [remoteOrigin, moduleId, moduleVersion, isMounted]);

  if (!isMounted) {
    return null;
  }

  return <div className="h-full w-full">{Ext && <Ext />}</div>;
}
