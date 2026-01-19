import Loading from "@/components/interface/status-screens/loading";
import NotAuthorized from "@/components/interface/status-screens/not-authorized";
import { IMCContext } from "@/components/providers/imc-provider";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { AppViewConfig, ExtensionApp } from "@/lib/types";
import { ViewModel } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import { compare } from "semver";
import SandboxAppLoader from "../../app-loaders/sandbox-app-loader";

export default function BaseAppView({
  config,
  viewId,
}: {
  config: AppViewConfig;
  viewId: string;
}) {
  const imcContext = useContext(IMCContext);

  const {
    installedExtensionApps,
    installExtensionApp,
    uninstallExtensionApp,
    loadAppFromCache,
    loadAppFromRegistry,
    loadAppFromURL,
  } = useExtensionAppManager();

  const [noAccessToApp, setNoAccessToApp] = useState<boolean>(false);
  const [pulseAppViewModel, setPulseAppViewModel] = useState<
    ViewModel | undefined
  >(undefined);
  const [isOpened, setIsOpened] = useState<boolean>(false);

  useEffect(() => {
    async function installAndOpenApp(ext: ExtensionApp) {
      // Update extension app if ext is newer
      const isInstalled = installedExtensionApps.find(
        (app) => app.config.id === ext.config.id,
      );

      const isNewerVersion = isInstalled
        ? compare(ext.config.version, isInstalled.config.version) === 1
        : false;

      if (isInstalled && isNewerVersion) {
        console.log(
          `Updating extension app ${ext.config.id} to version ${ext.config.version}`,
        );
        await uninstallExtensionApp(ext.config.id);
      }

      await installExtensionApp(
        ext.remoteOrigin,
        ext.config.id,
        ext.config.version,
      );
      const viewModel: ViewModel = {
        viewId: viewId,
        appConfig: ext.config,
      };
      setPulseAppViewModel(viewModel);
    }

    async function openApp() {
      console.log("App query parameter:", config.app);

      if (!config.app) return;

      const cachedExt = await loadAppFromCache(config.app);
      if (cachedExt) {
        await installAndOpenApp(cachedExt);
      } else if (
        config.app?.startsWith("http://") ||
        config.app?.startsWith("https://")
      ) {
        const ext = await loadAppFromURL(config.app);
        if (!ext) return;
        await installAndOpenApp(ext);
      } else {
        try {
          const ext = await loadAppFromRegistry(
            config.app,
            config.inviteCode ?? undefined,
          );
          if (!ext) return;
          await installAndOpenApp(ext);
        } catch (error: any) {
          console.error("Error loading app from registry:", error);
          if (
            error?.cause === "not-found" ||
            error?.cause === "not-authorized"
          ) {
            setNoAccessToApp(true);
          }
        }
      }
    }

    if (!isOpened) {
      openApp().then(() => setIsOpened(true));
    }
  }, [config, installExtensionApp, isOpened]);

  return noAccessToApp ? (
    <div className="bg-content3 h-full w-full">
      <NotAuthorized />
    </div>
  ) : !pulseAppViewModel ? (
    <div className="bg-content1 h-full w-full">
      <Loading text="Searching for app..." />
    </div>
  ) : (
    <SandboxAppLoader
      viewModel={pulseAppViewModel}
      onInitialLoaded={() => imcContext?.markIMCInitialized(viewId)}
    />
  );
}
