import { useEffect, useRef, useState } from "react";
import React from "react";
import { v4 } from "uuid";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";

export default function ExtensionLoader({
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
