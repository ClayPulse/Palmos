"use client";

import { Button } from "@heroui/react";
import Icon from "../misc/icon";
import { useContext, useEffect, useState } from "react";
import PasswordScreen from "../modals/password-modal";
import { useTheme } from "next-themes";
import NavMenu from "./nav-menu";
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import Loading from "./loading";
import VoiceIndicator from "./voice-indicator";
import ProjectIndicator from "./project-indicator";

export default function Nav({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const editorContext = useContext(EditorContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordScreenOpen, setIsPasswordScreenOpen] = useState(false);

  const { theme, setTheme } = useTheme();

  const [isShowNavbar, setIsShowNavbar] = useState(true);

  useEffect(() => {
    const platform = getPlatform();
    // Hide NavMenu if opened in VSCode Extension,
    // rely on VSCode's native navigation instead.
    console.log("Platform:", platform);
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
    if (
      editorContext?.persistSettings?.isUsePassword
    ) {
      setIsPasswordScreenOpen(true);
    }
  }, [editorContext?.persistSettings]);

  // If the component is not mounted, the theme can't be determined.
  if (!mounted) {
    return <Loading />;
  }


  return (
    <div className="grid grid-rows-[max-content_auto] h-screen w-full flex-col overflow-x-hidden">
      <PasswordScreen
        isOpen={isPasswordScreenOpen}
        setIsOpen={setIsPasswordScreenOpen}
      />

      {isShowNavbar && (
        <div className="z-40 h-12 w-full">
          <div
            className={
              "grid h-12 w-full grid-cols-3 grid-rows-1  px-2 py-1 text-default-foreground"
            }
          >
            <div className="col-start-1">
              <Button
                isIconOnly
                onPress={() => {
                  setIsMenuOpen(!isMenuOpen);
                }}
                disableRipple
                variant="light"
              >
                {isMenuOpen ? (
                  <Icon name="close" variant="round" />
                ) : (
                  <Icon name="menu" variant="round" />
                )}
              </Button>
            </div>
            <div className="col-start-2 flex flex-col items-center justify-center">
              {editorContext?.editorStates.project && <ProjectIndicator />}
              <VoiceIndicator />
            </div>
            <div className="col-start-3 flex justify-end">
              <Button
                // Disable on hover background
                className="data-[hover=true]:bg-transparent"
                isIconOnly
                disableRipple
                variant="light"
                onPress={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
              >
                {theme === "dark" ? (
                  <Icon name="dark_mode" variant="round" />
                ) : (
                  <Icon name="light_mode" variant="round" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`relative flex h-full w-full overflow-hidden`}
      >
        {isShowNavbar && (
          <NavMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        )}

        <div className="min-w-0 grow">{children}</div>
      </div>
    </div>
  );
}
