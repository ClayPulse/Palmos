import { useContext, useEffect, useState } from "react";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { getPlatform } from "../platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import { CapacitorAPI } from "../platform-api/capacitor/capacitor-api";
import { ElectronAPI } from "../platform-api/electron/electron-api";
import { CloudAPI } from "../platform-api/cloud/cloud-api";
import { EditorContext } from "@/components/providers/editor-context-provider";

export function usePlatformApi() {
  const editorContext = useContext(EditorContext);
  const [platformApi, setPlatformApi] = useState<
    AbstractPlatformAPI | undefined
  >(undefined);

  useEffect(() => {
    const api = getAbstractPlatformAPI();
    setPlatformApi(api);
  }, []);

  // When workspace changes, reset platform API if needed
  useEffect(() => {
    if (platformApi && editorContext?.editorStates.currentWorkspace) {
      const api = getAbstractPlatformAPI();
      setPlatformApi(api);
    }
  }, [editorContext?.editorStates.currentWorkspace]);

  function getAbstractPlatformAPI(): AbstractPlatformAPI {
    const platform = getPlatform();

    if (platform === PlatformEnum.Capacitor) {
      return new CapacitorAPI();
    } else if (platform === PlatformEnum.Electron) {
      return new ElectronAPI();
    } else if (
      platform === PlatformEnum.Web ||
      platform === PlatformEnum.WebMobile
    ) {
      const workspace = editorContext?.editorStates.currentWorkspace;
      return new CloudAPI(workspace);
    } else if (platform === PlatformEnum.VSCode) {
      // platformApi.current = new VSCodeAPI();
      throw new Error("VSCode API not implemented");
    } else {
      throw new Error("Unknown platform");
    }
  }

  return {
    platformApi,
  };
}
