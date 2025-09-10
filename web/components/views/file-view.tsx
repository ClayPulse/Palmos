import ConsolePanelView from "./console-panel-view";
import { useViewManager } from "@/lib/hooks/use-view-manager";
import ExtensionViewLayout from "./layout";
import ViewLoader from "./loaders/view-loader";
import useExtensionManager from "@/lib/hooks/use-extension-manager";
import { Extension, ExtensionMeta } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { compare } from "semver";
import { ViewModel } from "@pulse-editor/shared-utils";
import NotAuthorized from "../interface/not-authorized";
import { fetchAPI } from "@/lib/utils/backend";

export default function FileView() {
  const { updateViewModel, activeViewModel } = useViewManager();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");
  const inviteCode = params.get("inviteCode");

  const { installExtension } = useExtensionManager();
  const [pulseAppViewModel, setPulseAppViewModel] = useState<
    ViewModel | undefined
  >(undefined);
  const [noAccessToApp, setNoAccessToApp] = useState<boolean>(false);

  useEffect(() => {
    // Download and load the extension app if specified
    async function loadApp(appName: string, inviteCode?: string) {
      const url = new URL(
        `/api/extension/get`,
      );
      url.searchParams.set("name", appName);
      url.searchParams.set("latest", "true");
      if (inviteCode) url.searchParams.set("inviteCode", inviteCode);

      const res = await fetchAPI(url, {
        credentials: "include",
      });

      if (!res.ok) {
        setNoAccessToApp(true);
        return;
      }

      const fetchedExts: ExtensionMeta[] = await res.json();

      console.log("Fetched extensions:", fetchedExts);

      const extensions: Extension[] = fetchedExts.map((ext) => {
        return {
          config: {
            id: ext.name,
            version: ext.version,
            author: ext.user ? ext.user.name : ext.org.name,
            description: ext.description ?? "No description available",
            displayName: ext.displayName ?? ext.name,
            visibility: ext.visibility,
          },
          isEnabled: true,
          remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
        };
      });

      // Get the latest version of the extension
      const ext = extensions.sort((a, b) => {
        return compare(b.config.version, a.config.version);
      })[0];

      if (!ext) {
        setNoAccessToApp(true);
        return;
      }

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
      loadApp(app, inviteCode ?? undefined);
    }
  }, [app]);

  // #endregion

  if (noAccessToApp) {
    return <NotAuthorized />;
  }

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

        <ConsolePanelView />
      </div>
    </div>
  );
}
