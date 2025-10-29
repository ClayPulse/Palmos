import { PlatformEnum } from "@/lib/enums";
import { useEffect, useState } from "react";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { CapacitorAPI } from "../platform-api/capacitor/capacitor-api";
import { CloudAPI } from "../platform-api/cloud/cloud-api";
import { ElectronAPI } from "../platform-api/electron/electron-api";
import { getPlatform } from "../platform-api/platform-checker";
import { useWorkspace } from "./use-workspace";

export function usePlatformApi() {
  const { workspace } = useWorkspace();

  const [platformApi, setPlatformApi] = useState<
    AbstractPlatformAPI | undefined
  >(undefined);

  useEffect(() => {
    const api = getAbstractPlatformAPI();
    setPlatformApi(api);
  }, []);

  // When workspace changes, reset platform API if needed
  useEffect(() => {
    if (platformApi && workspace) {
      const api = getAbstractPlatformAPI();
      setPlatformApi(api);
    }
  }, [workspace]);

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
