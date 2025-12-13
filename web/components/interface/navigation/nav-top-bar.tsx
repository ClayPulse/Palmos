import { PlatformEnum } from "@/lib/enums";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useAuth } from "@/lib/hooks/use-auth";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect } from "react";
import Icon from "../../misc/icon";
import { EditorContext } from "../../providers/editor-context-provider";
import ProjectIndicator from "../project-indicator";
import VoiceIndicator from "../voice-indicator";
import FileMenuDropDown from "./menu-dropdown/file-menu";
import ViewMenuDropDown from "./menu-dropdown/view-menu";

export default function NavTopBar({
  isMenuOpen,
  setIsMenuOpen,
  setIsSharingOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  setIsSharingOpen: (isOpen: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);

  const { session, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");

  const { menuActions, runMenuActionByKeyboardShortcut } = useMenuActions();

  // Handle menu action shortcuts
  useEffect(() => {
    async function handleKeyDown(event: KeyboardEvent) {
      await runMenuActionByKeyboardShortcut(event);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuActions]);

  return (
    <div
      className="absolute z-40 w-full px-2 py-2"
      style={{
        paddingTop: getPlatform() === PlatformEnum.Capacitor ? 0 : undefined,
      }}
    >
      <div
        className={
          "text-default-foreground bg-content1 grid h-14 w-full grid-cols-3 grid-rows-1 rounded-xl px-2 py-2 shadow-md"
        }
      >
        <div className="col-start-1 flex items-center sm:gap-x-1">
          {!isMenuOpen && (
            <Button
              isIconOnly
              onPress={() => {
                setIsMenuOpen(!isMenuOpen);
              }}
              disableRipple
              variant="light"
            >
              <Icon name="menu" variant="round" />
            </Button>
          )}

          <FileMenuDropDown />
          <ViewMenuDropDown />
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

          <Button
            // Disable on hover background
            className="data-[hover=true]:bg-transparent"
            isIconOnly
            variant="light"
            onPress={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }}
          >
            {resolvedTheme === "dark" ? (
              <Icon name="dark_mode" variant="round" />
            ) : (
              <Icon name="light_mode" variant="round" />
            )}
          </Button>
          {!session && (
            <Button
              onPress={() => {
                editorContext?.setEditorStates((prev) => {
                  return {
                    ...prev,
                    isSigningIn: true,
                  };
                });
              }}
            >
              Sign In
            </Button>
          )}
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
                    <span className="font-semibold">{session.user.name}</span>
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
  );
}
