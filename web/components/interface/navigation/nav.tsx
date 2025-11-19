"use client";

import Icon from "@/components/misc/icon";
import { PlatformEnum } from "@/lib/enums";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import { useAuth } from "@/lib/hooks/use-auth";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { AppInfoModalContent } from "@/lib/types";
import {
  SafeArea,
  SystemBarsStyle,
  SystemBarsType,
} from "@capacitor-community/safe-area";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { useContext, useEffect, useState } from "react";
import AppInfoModal from "../../modals/app-info-modal";
import LoginModal from "../../modals/login-modal";
import PasswordModal from "../../modals/password-modal";
import SharingModal from "../../modals/sharing-modal";
import { EditorContext } from "../../providers/editor-context-provider";
import Loading from "../status-screens/loading";
import NavSideMenu from "./nav-side-menu";
import NavTopBar from "./nav-top-bar";

import packageJson from "../../../../package.json";
import readme from "../../../../README.md";

const appInfo: AppInfoModalContent = {
  id: "pulse-editor",
  name: "Pulse Editor",
  version: packageJson.version,
  author: "ClayPulse",
  license: "MIT",
  url: "https://pulse-editor.com",
  readme: readme,
};

export default function Nav({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const editorContext = useContext(EditorContext);
  const isMenuOpen = editorContext?.editorStates.isSideMenuOpen ?? false;

  const { setTheme, resolvedTheme } = useTheme();
  const { session, isLoading: isLoadingSession, signIn } = useAuth();
  const { openAppInfoModal } = useAppInfo();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isShowNavbar, setIsShowNavbar] = useState(true);

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
    if (getPlatform() === PlatformEnum.Capacitor) {
      if (resolvedTheme === "light") {
        SafeArea.setSystemBarsStyle({
          style: SystemBarsStyle.Dark,
          type: SystemBarsType.StatusBar,
        });
        SafeArea.showSystemBars({
          type: SystemBarsType.StatusBar,
        });
      } else if (resolvedTheme === "dark") {
        SafeArea.setSystemBarsStyle({
          style: SystemBarsStyle.Light,
          type: SystemBarsType.StatusBar,
        });
        SafeArea.showSystemBars({
          type: SystemBarsType.StatusBar,
        });
      }
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

      {isSharingOpen && (
        <SharingModal isOpen={isSharingOpen} setIsOpen={setIsSharingOpen} />
      )}

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
              setIsSharingOpen={setIsSharingOpen}
            />
          )}

          <div className={`flex h-full w-full overflow-hidden`}>{children}</div>
        </div>
      </div>

      <Button
        isIconOnly
        className="absolute right-2 bottom-2"
        variant="light"
        onPress={() => {
          openAppInfoModal(appInfo);
        }}
      >
        <Icon name="info" />
      </Button>
      <AppInfoModal />
    </div>
  );
}
