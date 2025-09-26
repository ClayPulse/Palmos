import NotAuthorized from "@/components/interface/not-authorized";
import useExtensionManager from "@/lib/hooks/use-extension-manager";
import { fetchAPI, getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { AppViewConfig, Extension, ExtensionMeta } from "@/lib/types";
import { ViewModel } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import { compare } from "semver";
import SandboxAppLoader from "../../app-loaders/sandbox-app-loader";
import Loading from "@/components/interface/loading";
import { IMCContext } from "@/components/providers/imc-provider";
import {
  getHostMFVersion,
  getRemoteMFVersion,
} from "@/lib/module-federation/version";
import toast from "react-hot-toast";

export default function BaseAppView({
  config,
  viewId,
}: {
  config: AppViewConfig;
  viewId: string;
}) {
  const imcContext = useContext(IMCContext);

  const [noAccessToApp, setNoAccessToApp] = useState<boolean>(false);
  const { installExtension } = useExtensionManager();
  const [pulseAppViewModel, setPulseAppViewModel] = useState<
    ViewModel | undefined
  >(undefined);

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
      // Remote origin is everything before the last two parts
      const remoteOrigin = url.origin + parts.slice(0, -2).join("/");

      const remoteMFVersion = await getRemoteMFVersion(
        remoteOrigin,
        extensionId,
        version,
      );

      const hostMFVersion = await getHostMFVersion();

      if (remoteMFVersion !== hostMFVersion) {
        toast.error(
          `Extension MF version (${remoteMFVersion}) does not match host MF version (${hostMFVersion}). Please install a compatible version.`,
        );
        return;
      }

      const ext: Extension = {
        config: {
          id: extensionId,
          version: version,
          mfVersion: remoteMFVersion,
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

      const res = await fetchAPI(url);

      if (!res.ok) {
        setNoAccessToApp(true);
        return;
      }

      const fetchedExts: ExtensionMeta[] = await res.json();

      console.log("Fetched extensions:", fetchedExts);

      const extensions: Extension[] = await Promise.all(
        fetchedExts.map(async (extMeta) => {
          // If backend does not provide mfVersion, try to load it from the manifest
          if (!extMeta.mfVersion) {
            console.warn(
              `Server does not provide mfVersion for extension ${extMeta.name}. Trying to load from manifest...`,
            );
          }
          const mfVersion =
            extMeta.mfVersion ??
            (await getRemoteMFVersion(
              `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
              extMeta.name,
              extMeta.version,
            ));

          return {
            config: {
              id: extMeta.name,
              version: extMeta.version,
              mfVersion: mfVersion,
              author: extMeta.user ? extMeta.user.name : extMeta.org.name,
              description: extMeta.description ?? "No description available",
              displayName: extMeta.displayName ?? extMeta.name,
              visibility: extMeta.visibility,
            },
            isEnabled: true,
            remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
          };
        }),
      );

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
      await installExtension(ext);
      const viewModel: ViewModel = {
        viewId: ext.config.id + "-" + viewId,
        extensionConfig: ext.config,
      };
      setPulseAppViewModel(viewModel);
    }

    async function loadApp() {
      console.log("App query parameter:", config.app);

      if (!config.app) return;
      else if (
        config.app?.startsWith("http://") ||
        config.app?.startsWith("https://")
      ) {
        const ext = await loadAppFromURL(config.app);
        if (!ext) return;
        await installAndOpenApp(ext);
      } else {
        const ext = await loadAppFromRegistry(
          config.app,
          config.inviteCode ?? undefined,
        );
        if (!ext) return;
        await installAndOpenApp(ext);
      }
    }

    loadApp();
  }, [config]);

  return noAccessToApp ? (
    <NotAuthorized />
  ) : !pulseAppViewModel ? (
    <Loading text="Searching for app..." />
  ) : (
    <SandboxAppLoader
      viewModel={pulseAppViewModel}
      onInitialLoaded={() => imcContext?.markIMCInitialized(viewId)}
    />
  );
}
