"use client";

import { App, URLOpenListenerEvent } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { StatusBar } from "@capacitor/status-bar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CapacitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Set status bar based on orientation
  useEffect(() => {
    async function setStatusBar() {
      const orientation = await ScreenOrientation.orientation();
      if (
        orientation.type === "landscape-primary" ||
        orientation.type === "landscape-secondary"
      ) {
        // If landscape mode is enabled full screen and hide status bar.
        StatusBar.setOverlaysWebView({ overlay: true });
        StatusBar.hide();
      } else {
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.show();
      }
    }

    // Check if Capacitorjs is available
    if (Capacitor.isNativePlatform()) {
      ScreenOrientation.addListener("screenOrientationChange", setStatusBar);
    }
  }, []);

  // Set deep linking listener
  useEffect(() => {
    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      // Check if the url has our scheme "https://mobile.pulse-editor.com"
      if (event.url.startsWith("https://pulse-editor.com/mobile")) {
        const slug = event.url.replace("https://pulse-editor.com/mobile", "");
        // Navigate to the slug
        if (slug) {
          router.push(slug);
        }
      }
      // If no match, do nothing - let regular routing
      // logic take over
    });
  }, []);

  return <div className="safe-area-padding h-full w-full">{children}</div>;
}
