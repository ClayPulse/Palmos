import { EditorContext } from "@/components/providers/editor-context-provider";
import { addToast } from "@heroui/react";
import { useContext } from "react";
import {
  fetchLatestApp,
  getDefaultRemoteOrigin,
} from "../module-federation/remote";
import { isAppAuthor } from "../pulse-editor-website/helpers";
import { ExtensionApp } from "../types";
import { useTranslations } from "./use-translations";

export function useVibeCode() {
  const editorContext = useContext(EditorContext);

  const { getTranslations: t } = useTranslations();

  async function openVibeCode(baseApp?: { appId: string; version: string }) {
    if (baseApp) {
      addToast({
        title: t("statusScreens.loading.title"),
        description: t("vibeCode.verifyingAuthor"),
        color: "default",
      });

      const isAuthor = await isAppAuthor(baseApp.appId);
      if (!isAuthor) {
        addToast({
          title: t("statusScreens.error.title"),
          description: t("vibeCode.notAuthor"),
          color: "danger",
        });
        return;
      }
    }

    const app = await getVibeCodeApp();

    if (!app) {
      return;
    }

    editorContext?.updateModalStates({
      quickVibeCodeSetup: {
        isOpen: true,
        app: app,
        baseApp
      },
    });
  }

  async function getVibeCodeApp() {
    const appId = "vibe_dev_flow";

    let latestVersion;
    try {
      latestVersion = await fetchLatestApp(appId);
    } catch (error) {
      console.error("Failed to fetch latest version.");
      addToast({
        title: t("statusScreens.error.title"),
        description: t("vibeCode.fetchFailed"),
        color: "danger",
      });
      return null;
    }

    const app: ExtensionApp = {
      config: latestVersion.appConfig!,
      remoteOrigin: getDefaultRemoteOrigin(),
      isEnabled: true,
    };

    return app;
  }

  return {
    openVibeCode,
  };
}
