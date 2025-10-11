import { getPlatform } from "@/lib/platform-api/platform-checker";
import { useRef } from "react";

import { PlatformEnum } from "@/lib/enums";

export default function BaseAppLoader({
  remoteOrigin,
  moduleId,
  moduleVersion,
  viewId,
}: {
  remoteOrigin: string;
  moduleId: string;
  moduleVersion: string;
  viewId: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const platform = getPlatform();

  const src =
    platform === PlatformEnum.Electron && process.env.NODE_ENV === "production"
      ? `extension://-/?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`
      : platform === PlatformEnum.Capacitor &&
          process.env.NODE_ENV === "production"
        ? `/extension.html?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`
        : `/extension?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`;

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full"
      src={src}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
