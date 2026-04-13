"use client";

import ChatPanel from "@/components/interface/panels/chat-panel";
import ChatSessionSidebar from "@/components/interface/panels/chat-session-sidebar";
import { AppModeEnum, PlatformEnum } from "@/lib/enums";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { useTheme } from "next-themes";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../../providers/editor-context-provider";
import SideNavPanel from "../panels/side-nav-panel";
import AppNavBar from "./app-nav-bar";
import { ChatNavLeft, ChatNavRight } from "./chat-nav-bar";
import { EditorNavLeft, EditorNavRight } from "./nav-top-bar";

import { ViewAsBanner } from "@/components/misc/view-as-user-picker";
import RebrandBanner from "../rebrand-banner";
import WelcomeScreen from "../status-screens/welcome";

export default function Nav({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const editorContext = useContext(EditorContext);
  const isMenuOpen = editorContext?.editorStates.isSideMenuOpen ?? false;
  const appMode = editorContext?.editorStates.appMode ?? AppModeEnum.Agent;
  const [editorMounted, setEditorMounted] = useState(
    appMode === AppModeEnum.Editor,
  );
  useEffect(() => {
    if (appMode === AppModeEnum.Editor) setEditorMounted(true);
  }, [appMode]);

  const { setTheme } = useTheme();

  const [isShowNavbar, setIsShowNavbar] = useState(true);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);

  // Skip the welcome animation for chat mode. Check both the context state (for
  // in-session switches) and the raw URL param (for initial page loads before the
  // useEffect in page.tsx has applied the param to context).
  const isChatMode =
    appMode === AppModeEnum.Agent ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") ===
        AppModeEnum.Agent);
  const [isAnimationFinished, setIsAnimationFinished] = useState(isChatMode);

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
      {/* Welcome Screen - skipped for chat mode */}
      {!isAnimationFinished && !isChatMode && (
        <div className="fixed inset-0 z-50 h-full w-full">
          <WelcomeScreen setAnimationFinished={setIsAnimationFinished} />
        </div>
      )}

      {/* Rebrand announcement banner */}
      {mounted && <RebrandBanner />}
      {mounted && <ViewAsBanner />}

      {/* Main Content - Render as soon as mounted, but hidden/under welcome screen until animation finishes */}
      {mounted && (
        <div
          className={`bg-default relative hidden h-full w-full overflow-hidden data-[animation-finished=true]:block`}
          data-animation-finished={isAnimationFinished}
        >
          <div
            className={`relative h-full w-full overflow-hidden ${
              editorMounted && appMode === AppModeEnum.Editor
                ? "grid grid-cols-[max-content_1fr_max-content] grid-rows-1"
                : ""
            }`}
          >
            {/* Left side panel — only rendered after editor is first activated */}
            {editorMounted && (
              <div
                className={`h-full overflow-y-hidden ${appMode === AppModeEnum.Editor ? "block" : "hidden"}`}
              >
                {isShowNavbar && (
                  <SideNavPanel
                    isMenuOpen={isMenuOpen}
                    setIsMenuOpen={setIsMenuOpen}
                  />
                )}
              </div>
            )}
            {/* Middle column: sidebar + nav + children */}
            <div className="relative flex h-full w-full overflow-hidden">
              {/* Chat session sidebar — agent mode only */}
              {appMode === AppModeEnum.Agent && (
                <ChatSessionSidebar
                  isOpen={isChatSidebarOpen}
                  onClose={() => setIsChatSidebarOpen(false)}
                />
              )}
              <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              {isShowNavbar && (
                <AppNavBar
                  style={{
                    paddingTop:
                      getPlatform() === PlatformEnum.Capacitor ? 0 : undefined,
                  }}
                  left={
                    appMode === AppModeEnum.Agent ? (
                      <ChatNavLeft onToggleSidebar={() => setIsChatSidebarOpen((v) => !v)} isSidebarOpen={isChatSidebarOpen} />
                    ) : (
                      <EditorNavLeft
                        isMenuOpen={isMenuOpen}
                        setIsMenuOpen={setIsMenuOpen}
                      />
                    )
                  }
                  right={
                    appMode === AppModeEnum.Agent ? (
                      <ChatNavRight />
                    ) : (
                      <EditorNavRight
                        setIsSharingOpen={() =>
                          editorContext?.updateModalStates({
                            sharing: { isOpen: true },
                          })
                        }
                      />
                    )
                  }
                />
              )}
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="h-full w-full overflow-hidden">{children}</div>
              </div>
              </div>
            </div>
            {/* Right chat panel — only rendered after editor is first activated */}
            {editorMounted && (
              <div
                className={`h-full overflow-y-hidden ${appMode === AppModeEnum.Editor ? "block" : "hidden"}`}
              >
                {isShowNavbar && <ChatPanel />}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
