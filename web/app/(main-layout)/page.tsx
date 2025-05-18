"use client";

import EditorToolbar from "@/components/interface/editor-toolbar";
import ExtensionSuggestionOverlay from "@/components/interface/extension-suggestion-overlay";
import Nav from "@/components/interface/nav";
import Voice from "@/components/tools/voice";
import ViewDisplayArea from "@/components/views/file-view-display-area";
import useAndroidManageStorageNotification from "@/lib/hooks/use-android-manage-storage-notification";
import { SafeArea } from "@capacitor-community/safe-area";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function HomePage() {
  useAndroidManageStorageNotification();

  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme === "light") {
      SafeArea.enable({
        config: {
          customColorsForSystemBars: true,
          statusBarContent: "dark",
          navigationBarContent: "dark",
        },
      });
    } else if (resolvedTheme === "dark") {
      SafeArea.enable({
        config: {
          statusBarContent: "light",
          navigationBarContent: "light",
        },
      });
    }
  }, [resolvedTheme]);

  return (
    <Nav>
      <div className="flex h-full w-full flex-col">
        <EditorToolbar />
        <ViewDisplayArea />

        <Voice />
        {false && <ExtensionSuggestionOverlay />}
      </div>
    </Nav>
  );
}
