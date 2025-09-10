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
import VoiceIndicator from "./voice-indicator";
import ProjectIndicator from "./project-indicator";
import { useAuth } from "@/lib/hooks/use-auth";
import { useTheme } from "next-themes";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { useSearchParams } from "next/navigation";
import { EditorContext } from "../providers/editor-context-provider";
import { useContext } from "react";

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

  const { session, signOut, isUsingOfflineMode, toggleOfflineMode } = useAuth();
  const { theme, setTheme } = useTheme();

  const workspaceHook = useWorkspace();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");

  return (
    <div className="z-40 w-full px-2 py-2 absolute">
      <div
        className={
          "text-default-foreground grid h-14 w-full grid-cols-3 grid-rows-1 px-2 py-2 bg-content1 rounded-xl shadow-md"
        }
      >
        <div className="col-start-1 flex gap-x-2">
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
          <Select
            className="max-w-50"
            classNames={{
              mainWrapper: "h-10",
              trigger: "py-0.5 min-h-10",
            }}
            label="Workspace"
            placeholder="Select Workspace"
            isLoading={!isUsingOfflineMode && !workspaceHook.cloudWorkspaces}
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
