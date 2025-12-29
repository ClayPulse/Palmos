import { PlatformEnum } from "@/lib/enums";
import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useAuth } from "@/lib/hooks/use-auth";
import useRouter from "@/lib/hooks/use-router";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { Browser } from "@capacitor/browser";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
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

  const { session, signOut, subscription, usage } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  // #region Load specified app if app query parameter is present
  const params = useSearchParams();
  // Use the 'app' query parameter to load specific extension app upon loading page
  const app = params.get("app");
  const workflow = params.get("workflow");

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

  const CloudIndicator = ({ onClick }: { onClick?: () => void }) =>
    session &&
    (editorContext?.persistSettings?.isUseManagedCloud ? (
      <div
        className="flex items-center gap-x-1 hover:cursor-pointer"
        onClick={onClick}
      >
        <div className="bg-success h-2 w-2 rounded-full"></div>
        <p className="text-success text-sm">Connected to Cloud AI</p>
      </div>
    ) : (
      <div
        className="flex items-center gap-x-1 hover:cursor-pointer"
        onClick={onClick}
      >
        <div className="bg-warning h-2 w-2 rounded-full"></div>
        <p className="text-warning text-sm">Offline</p>
      </div>
    ));

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
          {editorContext?.editorStates.project &&
            !editorContext.editorStates.isSideMenuOpen && <ProjectIndicator />}
          <VoiceIndicator />
        </div>
        <div className="col-start-3 flex justify-end gap-x-1">
          <div className="hidden items-center sm:flex">
            <CloudIndicator
              onClick={() => {
                editorContext?.updateModalStates({
                  editorSettings: {
                    isOpen: true,
                  },
                });
              }}
            />
          </div>

          {(app || workflow) && (
            <Button
              className="hidden sm:block"
              color="primary"
              onPress={() => {
                setIsSharingOpen(true);
              }}
            >
              {app ? <span>Share App</span> : <span>Share</span>}
            </Button>
          )}
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
                  <p className="text-medium w-full text-center font-semibold">
                    {session.user.name}
                  </p>
                }
              >
                <DropdownSection showDivider title="Subscription">
                  <DropdownItem
                    key={"subscription-plan"}
                    isReadOnly
                    variant="faded"
                  >
                    <div>
                      <p className="text-medium text-center">
                        Subscription Plan
                      </p>
                      <p className="text-center font-semibold">
                        {subscription?.name}
                      </p>
                      <p className="text-medium text-center">
                        Credits Remaining
                      </p>
                      <p className="text-center font-semibold">
                        {usage?.remainingCredit}
                      </p>
                      <div className="flex items-center justify-center">
                        <CloudIndicator />
                      </div>
                    </div>
                  </DropdownItem>
                </DropdownSection>

                <DropdownSection title={"Account"}>
                  <DropdownItem
                    key={"manage-plan"}
                    onPress={() => {
                      if (getPlatform() === PlatformEnum.Capacitor) {
                        const url = getAPIUrl("/pricing");
                        url.searchParams.set(
                          "callbackUrl",
                          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/mobile",
                        );

                        Browser.open({
                          url: url.toString(),
                        });
                      } else {
                        router.replace(getAPIUrl("/pricing").toString());
                      }
                    }}
                  >
                    Manage Plan
                  </DropdownItem>
                  <DropdownItem
                    key={"sign-out"}
                    onPress={() => {
                      signOut();
                    }}
                    className="text-danger"
                  >
                    Sign out
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
}
