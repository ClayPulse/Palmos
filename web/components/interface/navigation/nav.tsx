"use client";

import { PlatformEnum } from "@/lib/enums";
import useAndroidManageStorageNotification from "@/lib/hooks/use-android-manage-storage-notification";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { SafeArea } from "@capacitor-community/safe-area";
import { useTheme } from "next-themes";
import { useContext, useEffect, useState } from "react";
import AppInfoModal from "../../modals/app-info-modal";
import LoginModal from "../../modals/login-modal";
import PasswordModal from "../../modals/password-modal";
import SharingModal from "../../modals/sharing-modal";
import WorkspaceSettingsModal from "../../modals/workspace-settings-model";
import { EditorContext } from "../../providers/editor-context-provider";
import Loading from "../loading";
import NavSideMenu from "./nav-side-menu";
import NavTopBar from "./nav-top-bar";

export default function Nav({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const editorContext = useContext(EditorContext);
  const isMenuOpen = editorContext?.editorStates.isSideMenuOpen ?? false;

  const { setTheme, resolvedTheme } = useTheme();
  const { session, isLoading: isLoadingSession, signIn } = useAuth();
  const workspaceHook = useWorkspace();
  useAndroidManageStorageNotification();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isShowNavbar, setIsShowNavbar] = useState(true);
  const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] =
    useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);

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
      setIsPasswordModalOpen(true);
    }
  }, [editorContext?.persistSettings]);

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

  function setIsMenuOpen(isOpen: boolean) {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isSideMenuOpen: isOpen,
    }));
  }

  // If the component is not mounted, the theme can't be determined.
  if (!mounted) {
    return <Loading />;
  }

  return (
    <div className="bg-default flex h-full w-full flex-col overflow-x-hidden">
      {isPasswordModalOpen && (
        <PasswordModal
          isOpen={isPasswordModalOpen}
          setIsOpen={setIsPasswordModalOpen}
        />
      )}

      {!isLoadingSession &&
        !session &&
        editorContext?.editorStates.isSigningIn && (
          <LoginModal signIn={signIn} />
        )}

      {isWorkspaceSettingsModalOpen && (
        <WorkspaceSettingsModal
          isOpen={isWorkspaceSettingsModalOpen}
          setIsOpen={setIsWorkspaceSettingsModalOpen}
          workspaceHook={workspaceHook}
        />
      )}

      {isSharingOpen && (
        <SharingModal isOpen={isSharingOpen} setIsOpen={setIsSharingOpen} />
      )}

      <AppInfoModal />

      <div className="grid h-full w-full grid-cols-[max-content_auto]">
        <div className="h-full w-full overflow-y-hidden">
          {isShowNavbar && (
            <NavSideMenu
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
            />
          )}
        </div>
        <div className="relative h-full w-full">
          {isShowNavbar && (
            <NavTopBar
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              setIsWorkspaceSettingsModalOpen={setIsWorkspaceSettingsModalOpen}
              setIsSharingOpen={setIsSharingOpen}
            />
          )}

          <div className={`flex h-full w-full overflow-hidden`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
