"use client";

import { App, URLOpenListenerEvent } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { StatusBar } from "@capacitor/status-bar";
import { useContext, useEffect } from "react";
import { EditorContext } from "./editor-context-provider";

export default function CapacitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const editorContext = useContext(EditorContext);

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
    App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
      /* 
        Custom Scheme
      */
      // check if the url has our custom scheme "pulse-editor://open"
      if (event.url.startsWith("pulse-editor://open")) {
        const params = new URLSearchParams(
          event.url.replace("pulse-editor://open?", ""),
        );
        const token = params.get("token");
        const exp = params.get("exp");

        // Set token in Preferences and refresh session.
        // After refresh, the cookie will be set in the webview automatically.
        // Hence, no need to set cookie manually here.
        if (token) {
          await Preferences.set({
            key: "pulse-editor.session-token",
            value: token,
          });
          if (exp) {
            await Preferences.set({
              key: "pulse-editor.session-expiration",
              value: exp,
            });
          }
        } else {
          await Preferences.remove({
            key: "pulse-editor.session-token",
          });
        }
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isRefreshSession: true,
          isSigningIn: false,
        }));
      }
      /*       
        Google Verified Links
        Check if the url has our scheme "https://mobile.pulse-editor.com" 
      */
      // else if (event.url.startsWith("https://pulse-editor.com/mobile")) {
      //   const slug = event.url.replace("https://pulse-editor.com/mobile", "");
      //   // Navigate to the slug
      //   if (slug) {
      //     router.push(slug);
      //   }
      // }

      // If no match, do nothing - let regular routing
      // logic take over
    });
  }, []);

  return <div className="safe-area-padding h-full w-full">{children}</div>;
}
