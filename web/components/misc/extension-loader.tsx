import { useEffect, useRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { loadRemote, preloadRemote } from "@module-federation/runtime";
import React from "react";

export default function ExtensionLoader({
  remoteOrigin,
  moduleId,
  moduleVersion,
}: {
  remoteOrigin: string;
  moduleId: string;
  moduleVersion: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    function renderExtension(LoadedExtension: any) {
      if (iframeRef.current) {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentWindow?.document;

        if (iframeDoc) {
          iframeDoc.body.innerHTML = '<div id="extension-root"></div>';

          const rootElement = iframeDoc.getElementById("extension-root");
          if (rootElement) {
            const root = createRoot(rootElement, {});
            rootRef.current = root;
            // Inject extension global styles into iframe
            const link = iframeDoc.createElement("link");
            link.rel = "stylesheet";
            link.href = `${remoteOrigin}/${moduleId}/${moduleVersion}/__federation_expose_main.globals.css`;
            iframeDoc.head.appendChild(link);
            root.render(<LoadedExtension />);
          }
        }
      }
    }

    let isMounted = true;

    loadRemote(`${moduleId}/main`)
      .then((module) => {
        // Prevent state updates if component is unmounted
        if (!isMounted) return;

        // @ts-expect-error Types are not available since @module-federation/enhanced
        // cannot work in Nextjs App router. Hence types are not generated.
        const { default: LoadedExtension, Config } = module;

        renderExtension(LoadedExtension);
      })
      .catch((error) => {
        console.error("Error loading remote module:", error);
      });

    return () => {
      // Unmount React module inside the iframe.
      if (rootRef.current) {
        // Defer unmounting to avoid React rendering conflicts.
        setTimeout(() => {
          rootRef.current?.unmount();
          rootRef.current = null;

          // Clear iframe content
          if (iframeRef.current?.contentWindow?.document) {
            iframeRef.current.contentWindow.document.body.innerHTML = "";
          }
        }, 0);
      }

      isMounted = false;
    };
  }, []);

  return <iframe ref={iframeRef} className="h-full w-full" />;
}
