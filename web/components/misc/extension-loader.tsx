import { useContext, useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { loadRemote } from "@module-federation/runtime";
import React from "react";
import { v4 } from "uuid";
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";

export default function ExtensionLoader({
  remoteOrigin,
  moduleId,
  moduleVersion,
}: {
  remoteOrigin: string;
  moduleId: string;
  moduleVersion: string;
}) {
  // const rootRef = useRef<Root | null>(null);

  // const [viewId, setViewId] = React.useState<string | null>(null);
  // const editorContext = useContext(EditorContext);

  // useEffect(() => {
  //   async function renderExtension(LoadedExtension: any) {
  //     if (iframeRef.current) {
  //       const iframe = iframeRef.current;
  //       const iframeDoc = iframe.contentWindow?.document;

  //       if (iframeDoc) {
  //         iframeDoc.body.innerHTML = '<div id="extension-root"></div>';

  //         const rootElement = iframeDoc.getElementById("extension-root");
  //         if (rootElement) {
  //           // Inject extension global styles into iframe
  //           // not always named this, especially in production build
  //           const manifestUri = `${remoteOrigin}/${moduleId}/${moduleVersion}/mf-manifest.json`;
  //           const manifest = await fetch(manifestUri).then((res) => res.json());
  //           console.log("Manifest", manifest);
  //           const cssFiles = manifest.exposes[0].assets.css.sync as string[];

  //           for (const cssFile of cssFiles) {
  //             if (cssFile.endsWith(".css")) {
  //               // Need to make sure CDN returns the correct MIME type for CSS files (e.g. text/css);
  //               // otherwise, the CSS file will not be loaded in the iframe.
  //               // On local dev server, webpack dev handles MIME types automatically, so this is not an issue.
  //               const link = iframeDoc.createElement("link");
  //               link.rel = "stylesheet";
  //               link.href = `${remoteOrigin}/${moduleId}/${moduleVersion}/${cssFile}`;
  //               iframeDoc.head.appendChild(link);
  //             }
  //           }

  //           // Inject a view id into the iframe's window object
  //           const viewId = v4();
  //           const script = iframeDoc.createElement("script");
  //           script.textContent = `window.viewId = "${viewId}";`;
  //           iframeDoc.head.appendChild(script);

  //           const testScript = iframeDoc.createElement("script");
  //           testScript.textContent = `window === window.top ? console.log("Top window") : console.log("Subwindow");`;
  //           iframeDoc.head.appendChild(testScript);

  //           // @ts-expect-error Types are not available since @module-federation/enhanced
  //           window.subwindow = iframe.contentWindow;

  //           setViewId(viewId);
  //           editorContext?.setEditorStates((prev) => {
  //             return {
  //               ...prev,
  //               viewIds: [...prev.viewIds, viewId],
  //             };
  //           });

  //           // Create a new React root for the iframe
  //           const root = createRoot(rootElement, {});
  //           rootRef.current = root;
  //           root.render(<LoadedExtension />);
  //         }
  //       }
  //     }
  //   }

  //   let isMounted = true;

  //   loadRemote(`${moduleId}/main`)
  //     .then((module) => {
  //       // Prevent state updates if component is unmounted
  //       if (!isMounted) return;

  //       // @ts-expect-error Types are not available since @module-federation/enhanced
  //       // cannot work in Nextjs App router. Hence types are not generated.
  //       const { default: LoadedExtension, Config } = module;

  //       renderExtension(LoadedExtension);
  //     })
  //     .catch((error) => {
  //       console.error("Error loading remote module:", error);
  //     });

  //   return () => {
  //     // Unmount React module inside the iframe.
  //     if (rootRef.current) {
  //       // Defer unmounting to avoid React rendering conflicts.
  //       setTimeout(() => {
  //         rootRef.current?.unmount();
  //         rootRef.current = null;

  //         // Clear iframe content
  //         if (iframeRef.current?.contentWindow?.document) {
  //           iframeRef.current.contentWindow.document.body.innerHTML = "";
  //         }
  //       }, 0);
  //     }

  //     isMounted = false;

  //     // Unregister the view id
  //     if (viewId) {
  //       editorContext?.setEditorStates((prev) => {
  //         return {
  //           ...prev,
  //           viewIds: prev.viewIds.filter((id) => id !== viewId),
  //         };
  //       });
  //     }
  //   };
  // }, []);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const platform = getPlatform();

  useEffect(() => {
    const viewId =
      remoteOrigin + "-" + moduleId + "-" + moduleVersion + "-" + v4();
    setViewId(viewId);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full"
      src={
        platform === PlatformEnum.Electron &&
        process.env.NODE_ENV === "production"
          ? `extension://-/?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`
          : `/extension?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`
      }
    />
  );
}
