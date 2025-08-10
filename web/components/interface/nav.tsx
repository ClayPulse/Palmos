"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Select,
  SelectItem,
} from "@heroui/react";
import Icon from "../misc/icon";
import { useContext, useEffect, useState } from "react";
import PasswordModal from "../modals/password-modal";
import { useTheme } from "next-themes";
import NavMenu from "./nav-menu";
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import Loading from "./loading";
import VoiceIndicator from "./voice-indicator";
import ProjectIndicator from "./project-indicator";
import LoginModal from "../modals/login-modal";
import { useAuth } from "@/lib/hooks/use-auth";
import WorkspaceSettingsModal from "../modals/workspace-settings-model";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import useAndroidManageStorageNotification from "@/lib/hooks/use-android-manage-storage-notification";
import { SafeArea } from "@capacitor-community/safe-area";
import { useSearchParams } from "next/navigation";
import SharingModal from "../modals/sharing-modal";

export default function Nav({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const editorContext = useContext(EditorContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isShowNavbar, setIsShowNavbar] = useState(true);
  const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] =
    useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const {
    session,
    isLoading: isLoadingSession,
    signIn,
    signOut,
    isUsingOfflineMode,
    toggleOfflineMode,
  } = useAuth();

  const workspaceHook = useWorkspace();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");

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

  // If the component is not mounted, the theme can't be determined.
  if (!mounted) {
    return <Loading />;
  }

  return (
    <div className="grid h-full w-full grid-rows-[max-content_auto] flex-col overflow-x-hidden">
      {isPasswordModalOpen && (
        <PasswordModal
          isOpen={isPasswordModalOpen}
          setIsOpen={setIsPasswordModalOpen}
        />
      )}

      {!isLoadingSession && !session && !isUsingOfflineMode && (
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

      {isShowNavbar && (
        <div className="z-40 h-12 w-full">
          <div
            className={
              "text-default-foreground grid h-12 w-full grid-cols-3 grid-rows-1 px-2 py-1"
            }
          >
            <div className="col-start-1 flex gap-x-2">
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
              <Select
                className="max-w-50"
                classNames={{
                  mainWrapper: "h-10",
                  trigger: "py-0.5 min-h-10",
                }}
                label="Workspace"
                placeholder="Select Workspace"
                isLoading={
                  !isUsingOfflineMode && !workspaceHook.cloudWorkspaces
                }
                selectedKeys={
                  workspaceHook.workspace ? [workspaceHook.workspace.id] : []
                }
                size="sm"
                disabledKeys={workspaceHook.workspace ? [] : ["settings"]}
              >
                <>
                  {workspaceHook.cloudWorkspaces?.map((workspace) => (
                    <SelectItem
                      key={workspace.id}
                      onPress={() => {
                        workspaceHook.selectWorkspace(workspace.id);
                      }}
                    >
                      {workspace.name}
                    </SelectItem>
                  )) ?? []}
                  <SelectItem
                    className="bg-primary text-primary-foreground"
                    color="primary"
                    onPress={() => {
                      setIsWorkspaceSettingsModalOpen(true);
                    }}
                    startContent={
                      <div className="text-primary-foreground h-4 w-4">
                        <Icon name="add" variant="round" />
                      </div>
                    }
                  >
                    Create New
                  </SelectItem>
                  <SelectItem
                    key={"settings"}
                    className="bg-default"
                    onPress={() => {
                      setIsWorkspaceSettingsModalOpen(true);
                    }}
                    startContent={
                      <div className="h-4 w-4">
                        <Icon name="settings" variant="round" />
                      </div>
                    }
                  >
                    Settings
                  </SelectItem>
                </>
              </Select>
            </div>
            <div className="col-start-2 flex flex-col items-center justify-center">
              {editorContext?.editorStates.project && <ProjectIndicator />}
              <VoiceIndicator />
            </div>
            <div className="col-start-3 flex justify-end gap-x-1">
              <Button
                className="hidden sm:block"
                color="primary"
                onPress={() => {
                  setIsSharingOpen(true);
                }}
              >
                {app ? <span>Share App</span> : <span>Share</span>}
              </Button>
              <Button
                className="block sm:hidden"
                isIconOnly
                variant="light"
                onPress={() => {
                  setIsSharingOpen(true);
                }}
              >
                <Icon name="share" variant="round" />
              </Button>

              {isUsingOfflineMode && (
                <Button
                  onPress={() => {
                    toggleOfflineMode();
                  }}
                >
                  Sign-in
                </Button>
              )}
              <Button
                // Disable on hover background
                className="data-[hover=true]:bg-transparent"
                isIconOnly
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
              {session && (
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      className="text-md-on-secondary-container bg-md-secondary-container rounded-full"
                      variant="light"
                    >
                      <Icon name="account_circle" variant="round" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    topContent={
                      <p className="text-medium w-full px-2">
                        Welcome,{" "}
                        <span className="font-semibold">
                          {session.user.name}
                        </span>
                      </p>
                    }
                  >
                    <DropdownItem
                      key={"sign-out"}
                      onPress={() => {
                        signOut();
                      }}
                    >
                      Sign out
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`flex h-full w-full overflow-hidden`}>
        {isShowNavbar && (
          <NavMenu isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        )}

        {children}
      </div>
    </div>
  );
}
