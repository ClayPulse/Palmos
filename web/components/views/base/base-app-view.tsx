import Loading from "@/components/interface/loading";
import NotAuthorized from "@/components/interface/not-authorized";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import useExtensionManager from "@/lib/hooks/use-extension-manager";
import { AppViewConfig, ExtensionApp } from "@/lib/types";
import { ViewModel } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import SandboxAppLoader from "../../app-loaders/sandbox-app-loader";

export default function BaseAppView({
  config,
  viewId,
}: {
  config: AppViewConfig;
  viewId: string;
}) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const {
    installExtension,
    loadAppFromCache,
    loadAppFromRegistry,
    loadAppFromURL,
  } = useExtensionManager();

  const [noAccessToApp, setNoAccessToApp] = useState<boolean>(false);
  const [pulseAppViewModel, setPulseAppViewModel] = useState<
    ViewModel | undefined
  >(undefined);
  const [isOpened, setIsOpened] = useState<boolean>(false);

  useEffect(() => {
    async function installAndOpenApp(ext: ExtensionApp) {
      await installExtension(
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
  }, [config, installExtension, isOpened]);

  return noAccessToApp ? (
    <div className="bg-content1 h-full w-full">
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
