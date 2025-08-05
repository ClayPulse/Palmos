import AgenticConsolePanel from "./agentic-console-panel";
import { useViewManager } from "@/lib/hooks/use-view-manager";
import ExtensionViewLayout from "./layout";
import ViewLoader from "./loaders/view-loader";
import useExtensionManager from "@/lib/hooks/use-extension-manager";
import { Extension } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { compare } from "semver";
import { ViewModel } from "@pulse-editor/shared-utils";

export default function ViewDisplayArea() {
  const { updateViewModel, activeViewModel } = useViewManager();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");
  const { installExtension } = useExtensionManager();
  const [pulseAppViewModel, setPulseAppViewModel] = useState<
    ViewModel | undefined
  >(undefined);

  useEffect(() => {
    // Download and load the extension app if specified
    async function loadApp(appName: string) {
      const url = new URL(`https://pulse-editor.com/api/extension/get`);
      url.searchParams.set("name", appName);

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Failed to fetch extension app");
      }

      const fetchedExts: {
        name: string;
        version: string;
        description?: string;
        displayName?: string;
        user: {
          name: string;
        };
        org: {
          name: string;
        };
      }[] = await res.json();

      console.log("Fetched extensions:", fetchedExts);

      const extensions: Extension[] = fetchedExts.map((ext) => {
        return {
          config: {
            id: ext.name,
            version: ext.version,
            author: ext.user ? ext.user.name : ext.org.name,
            description: ext.description ?? "No description available",
            displayName: ext.displayName ?? ext.name,
          },
          isEnabled: true,
          remoteOrigin: `https://cdn.pulse-editor.com/extension`,
        };
      });

      // Get the latest version of the extension
      const ext = extensions.sort((a, b) => {
        return compare(b.config.version, a.config.version);
      })[0];

      console.log("Installing extension:", ext);

      await installExtension(ext);
      const viewModel: ViewModel = {
        viewId: ext.config.id,
        isFocused: true,
        extensionConfig: ext.config,
      };
      setPulseAppViewModel(viewModel);
    }

    if (app) {
      loadApp(app);
    }
  }, [app]);

  // #endregion

  return (
    <div className="flex h-full w-full flex-col p-1">
      <div className="bg-default flex h-full w-full flex-col items-start justify-between gap-1.5 overflow-hidden rounded-xl p-2">
        {activeViewModel ? (
          <ExtensionViewLayout>
            <ViewLoader
              viewModel={activeViewModel}
              setViewModel={updateViewModel}
            />
          </ExtensionViewLayout>
        ) : pulseAppViewModel ? (
          <ExtensionViewLayout>
            <ViewLoader
              viewModel={pulseAppViewModel}
              setViewModel={setPulseAppViewModel}
            />
          </ExtensionViewLayout>
        ) : (
          <div className="text-default-foreground flex h-full w-full flex-col items-center justify-center gap-y-1 pb-12">
            <h1 className="text-center text-2xl font-bold">
              Welcome to Pulse Editor!
            </h1>
            <p className="text-center text-lg font-normal">
              Start by opening a file or project.
            </p>
          </div>
        )}

        <AgenticConsolePanel />
      </div>
    </div>
  );
}
