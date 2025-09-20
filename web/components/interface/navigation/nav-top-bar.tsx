import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Select,
  SelectItem,
} from "@heroui/react";
import Icon from "../../misc/icon";
import VoiceIndicator from "../voice-indicator";
import ProjectIndicator from "../project-indicator";
import { useAuth } from "@/lib/hooks/use-auth";
import { useTheme } from "next-themes";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { useSearchParams } from "next/navigation";
import { EditorContext } from "../../providers/editor-context-provider";
import { useContext, useEffect } from "react";
import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { MenuAction, PlatformEnum } from "@/lib/types";
import FileMenuDropDown from "./menu-dropdown/file-menu";
import ViewMenuDropDown from "./menu-dropdown/view-menu";

export default function NavTopBar({
  isMenuOpen,
  setIsMenuOpen,
  setIsWorkspaceSettingsModalOpen,
  setIsSharingOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  setIsWorkspaceSettingsModalOpen: (isOpen: boolean) => void;
  setIsSharingOpen: (isOpen: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);

  const { session, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const workspaceHook = useWorkspace();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");

  const { menuActions } = useMenuActions();

  // Handle menu action shortcuts
  useEffect(() => {
    async function runAction(action: MenuAction, event: KeyboardEvent) {
      if (action.shortcut) {
        const keys = action.shortcut
          .toLowerCase()
          .split("+")
          .map((k) => k.trim());
        const ctrl = keys.includes("ctrl") || keys.includes("cmd");
        const shift = keys.includes("shift");
        const alt = keys.includes("alt");
        const key = keys.find(
          (k) => !["ctrl", "cmd", "shift", "alt"].includes(k),
        );
        if (
          (ctrl ? event.ctrlKey || event.metaKey : true) &&
          (shift ? event.shiftKey : true) &&
          (alt ? event.altKey : true) &&
          event.key.toLowerCase() === key
        ) {
          event.preventDefault();
          await action.actionFunc();
        }
      }
    }

    async function handleKeyDown(event: KeyboardEvent) {
      if (event.target && (event.target as HTMLElement).tagName === "INPUT") {
        return; // Ignore key presses when focused on input fields
      }

      for (const action of menuActions ?? []) {
        await runAction(action, event);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuActions]);

  return (
    <div className="absolute z-40 w-full px-2 py-2">
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

          {/* Do not show workspace selector when the app is open in web, and session is not available */}
          {(getPlatform() === PlatformEnum.Web ||
            getPlatform() === PlatformEnum.WebMobile) &&
          !session ? null : (
            <Select
              className="max-w-50"
              classNames={{
                mainWrapper: "h-10",
                trigger: "py-0.5 min-h-10",
              }}
              label="Workspace"
              placeholder="Select Workspace"
              isLoading={
                !editorContext?.editorStates?.isSigningIn &&
                !workspaceHook.cloudWorkspaces
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
          )}
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
