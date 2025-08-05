import { useEffect, useState } from "react";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { getPlatform } from "../platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import { CapacitorAPI } from "../platform-api/capacitor/capacitor-api";
import { ElectronAPI } from "../platform-api/electron/electron-api";
import { RemoteInstance } from "../platform-api/remote-workspace/remote-workspace-api";

export function usePlatformApi() {
  // const platformApi = useRef<AbstractPlatformAPI | undefined>(undefined);
  const [platformApi, setPlatformApi] = useState<
    AbstractPlatformAPI | undefined
  >(undefined);

  useEffect(() => {
    const api = getAbstractPlatformAPI();
    setPlatformApi(api);
  }, []);

  function getAbstractPlatformAPI(): AbstractPlatformAPI {
    const platform = getPlatform();

    if (platform === PlatformEnum.Capacitor) {
      return new CapacitorAPI();
    } else if (platform === PlatformEnum.Electron) {
      return new ElectronAPI();
    } else if (platform === PlatformEnum.Web) {
      return new RemoteInstance();
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
