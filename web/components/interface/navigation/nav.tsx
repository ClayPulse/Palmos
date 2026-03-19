"use client";

import { PlatformEnum } from "@/lib/enums";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { useTheme } from "next-themes";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import SideNavPanel from "../panels/side-nav-panel";
import NavTopBar from "./nav-top-bar";
import ChatPanel from "@/components/interface/panels/chat-panel";

import WelcomeScreen from "../status-screens/welcome";

export default function Nav({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const editorContext = useContext(EditorContext);
  const isMenuOpen = editorContext?.editorStates.isSideMenuOpen ?? false;

  const { setTheme } = useTheme();

  const [isShowNavbar, setIsShowNavbar] = useState(true);
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  useEffect(() => {
    const platform = getPlatform();
    // Hide NavMenu if opened in VSCode Extension,
    // rely on VSCode's native navigation instead.
    console.log("Current platform:", platform);
    if (platform === PlatformEnum.VSCode) {
      setIsShowNavbar(false);

      // Also check the if a theme token is passed from VSCode Extension.
      const vscodeTheme =
        new URLSearchParams(window.location.search).get("theme") ?? "dark";
      setTheme(vscodeTheme);
    }

    setMounted(true);
  }, []);

  // Open PasswordScreen if password is used
  useEffect(() => {
    if (editorContext?.persistSettings?.isUsePassword) {
      editorContext?.updateModalStates({ password: { isOpen: true } });
    }
  }, [editorContext?.persistSettings]);

  function setIsMenuOpen(isOpen: boolean) {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isSideMenuOpen: isOpen,
    }));
  }

  return (
    <>
      {/* Welcome Screen - Always render and plays immediately */}
      {!isAnimationFinished && (
        <div className="fixed inset-0 z-50 h-full w-full">
          <WelcomeScreen setAnimationFinished={setIsAnimationFinished} />
        </div>
      )}

      {/* Main Content - Render as soon as mounted, but hidden/under welcome screen until animation finishes */}
      {mounted && (
        <div
          className={`bg-default relative hidden h-full w-full overflow-hidden data-[animation-finished=true]:block`}
          data-animation-finished={isAnimationFinished}
        >
          {editorContext?.editorStates.appMode === "ai" ? (
            /* AI mode: full-screen, no nav chrome */
            <div className="h-full w-full overflow-hidden">{children}</div>
          ) : (
            /* Editor mode: full nav layout */
            <div className="relative grid h-full w-full grid-cols-[max-content_auto_max-content] grid-rows-1">
              <div className="h-full w-full overflow-y-hidden">
                {isShowNavbar && (
                  <SideNavPanel
                    isMenuOpen={isMenuOpen}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                )}
              </div>
              <div className="relative h-full w-full overflow-hidden">
                {isShowNavbar && (
                  <NavTopBar
                    isMenuOpen={isMenuOpen}
                    setIsMenuOpen={setIsMenuOpen}
                    setIsSharingOpen={() => {
                      editorContext?.updateModalStates({
                        sharing: { isOpen: true },
                      });
                    }}
                  />
                )}
                <div className={`h-full w-full overflow-hidden`}>{children}</div>
              </div>
              <div className="h-full w-full overflow-y-hidden">
                {isShowNavbar && <ChatPanel />}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
