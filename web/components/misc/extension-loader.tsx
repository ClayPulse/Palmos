import {  useEffect, useRef, useState } from "react";
import React from "react";
import { v4 } from "uuid";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";

export default function ExtensionLoader({
  remoteOrigin,
  moduleId,
  moduleVersion,
}: {
  remoteOrigin: string;
  moduleId: string;
  moduleVersion: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const platform = getPlatform();

  useEffect(() => {
    const viewId = moduleId + "-" + moduleVersion + "-" + v4();
    setViewId(viewId);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full"
      src={
        platform === PlatformEnum.Electron &&
        process.env.NODE_ENV === "production"
          ? `extension://-/?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`
          : `/extension?remoteOrigin=${remoteOrigin}&moduleId=${moduleId}&moduleVersion=${moduleVersion}&viewId=${viewId}`
      }
    />
  );
}
