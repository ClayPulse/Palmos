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
import { fetchAPI, getAPIUrl } from "@/lib/pulse-editor-website/backend";

export default function FileBrowseView() {
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
    // Download and load the extension app from a URL if specified
    async function loadAppFromURL(urlStr: string) {
      // the url is expected to be in the format of {remoteOrigin}/{extensionId}/{version}

      const url = new URL(urlStr);
      const parts = url.pathname.split("/").filter((part) => part.length > 0);
      if (parts.length < 2) {
        console.error("Invalid app URL format");
        return undefined;
      }
      const extensionId = parts[parts.length - 2];
      const version = parts[parts.length - 1];
      const remoteOrigin = url.origin;
      const ext: Extension = {
        config: {
          id: extensionId,
          version: version,
          author: "Unknown",
          description: "No description available",
          displayName: extensionId,
          visibility: "private",
        },
        isEnabled: true,
        remoteOrigin: remoteOrigin,
      };

      return ext;
    }

    // Download and load the extension app if specified
    async function loadAppFromRegistry(appName: string, inviteCode?: string) {
      const url = getAPIUrl(`/api/extension/get`);
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
        return undefined;
      }

      return ext;
    }

    async function installAndOpenApp(ext: Extension) {
      console.log("Installing extension:", ext);

      await installExtension(ext);
      const viewModel: ViewModel = {
        viewId: ext.config.id,
        isFocused: true,
        extensionConfig: ext.config,
      };
      setPulseAppViewModel(viewModel);
    }

    async function loadApp() {
      console.log("App query parameter:", app);

      if (!app) return;
      else if (app?.startsWith("http://") || app?.startsWith("https://")) {
        const ext = await loadAppFromURL(app);
        if (!ext) return;
        await installAndOpenApp(ext);
      } else {
        const ext = await loadAppFromRegistry(app, inviteCode ?? undefined);
        if (!ext) return;
        await installAndOpenApp(ext);
      }
    }

    loadApp();
  }, [app]);

  // #endregion

  if (noAccessToApp) {
    return <NotAuthorized />;
  }

  return (
    <div className="flex h-full w-full flex-col p-1 mt-15">
      <div className="bg-default flex h-full w-full flex-col items-start justify-between gap-1.5 overflow-hidden rounded-xl p-1">
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
      </div>
    </div>
  );
}
