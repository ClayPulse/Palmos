import { PlatformEnum } from "../enums";
import { RemoteWorkspace } from "../types";
import { AbstractPlatformAPI } from "./abstract-platform-api";
import { CloudAPI } from "./cloud/cloud-api";
import { ElectronAPI } from "./electron/electron-api";
import { getPlatform } from "./platform-checker";

export function getAbstractPlatformAPI(
  workspace: RemoteWorkspace | undefined,
): AbstractPlatformAPI {
  const platform = getPlatform();

  if (platform === PlatformEnum.Capacitor) {
    return new CloudAPI(workspace);
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
