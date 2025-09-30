import { PlatformEnum } from "@/lib/types";
import { Capacitor } from "@capacitor/core";
import isElectron from "is-electron";

export function getPlatform() {
  // Capacitor
  if (Capacitor.isNativePlatform()) {
    return PlatformEnum.Capacitor;
  }
  // Electron
  else if (isElectron()) {
    // VSCode runs on Electron.
    // The extension sets a query parameter to differentiate between the two.
    if (new URLSearchParams(window.location.search).get("vscode") === "true") {
      return PlatformEnum.VSCode;
    }
    return PlatformEnum.Electron;
  }

  // Check for mobile browser
  else if (/Mobi|Android/i.test(navigator.userAgent)) {
    return PlatformEnum.WebMobile;
  }

  // If none of the above, it's web
  return PlatformEnum.Web;
}

export function isMobile() {
  return (
    getPlatform() === PlatformEnum.Capacitor ||
    getPlatform() === PlatformEnum.WebMobile
  );
}

export function isWeb() {
  return (
    getPlatform() === PlatformEnum.Web ||
    getPlatform() === PlatformEnum.WebMobile
  );
}
