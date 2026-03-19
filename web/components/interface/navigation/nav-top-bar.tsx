"use client";

import { useMenuActions } from "@/lib/hooks/menu-actions/use-menu-actions";
import { useAuth } from "@/lib/hooks/use-auth";
import useRouter from "@/lib/hooks/use-router";
import {
  languageNames,
  LocaleType,
  useTranslations,
} from "@/lib/hooks/use-translations";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { PlatformEnum } from "@/lib/enums";
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
import FileMenuDropDown from "./menu-dropdown/file-menu";
import ViewMenuDropDown from "./menu-dropdown/view-menu";

export function EditorNavLeft({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  return (
    <div className="flex items-center sm:gap-x-1">
      {!isMenuOpen && (
        <Button
          isIconOnly
          onPress={() => setIsMenuOpen(!isMenuOpen)}
          disableRipple
          variant="light"
        >
          <Icon name="menu" variant="round" />
        </Button>
      )}
      <FileMenuDropDown />
      <ViewMenuDropDown />
    </div>
  );
}

export function EditorNavRight({
  setIsSharingOpen,
}: {
  setIsSharingOpen: (isOpen: boolean) => void;
}) {
  const { getTranslations: t, locale, setLocale } = useTranslations();
  const editorContext = useContext(EditorContext);

  const { session, signOut, subscription, usage } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

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

  const CloudIndicator = ({ onClick }: { onClick?: () => void }) =>
    session &&
    (editorContext?.persistSettings?.isUseManagedCloud ? (
      <div
        className="flex items-center gap-x-1 hover:cursor-pointer"
        onClick={onClick}
      >
        <div className="bg-success h-2 w-2 rounded-full"></div>
        <p className="text-success text-sm whitespace-nowrap">
          {t("navigation.connectedToCloudAI")}
        </p>
      </div>
    ) : (
      <div
        className="flex items-center gap-x-1 hover:cursor-pointer"
        onClick={onClick}
      >
        <div className="bg-warning h-2 w-2 rounded-full"></div>
        <p className="text-warning text-sm">{t("navigation.offline")}</p>
      </div>
    ));

  return (
    <div className="flex items-center gap-x-1">
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

          {app && (
            <Button
              className="hidden sm:block"
              color="primary"
              onPress={() => {
                setIsSharingOpen(true);
              }}
            >
              {app ? (
                <span>{t("common.shareApp")}</span>
              ) : (
                <span>{t("common.share")}</span>
              )}
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
              {t("common.signIn")}
            </Button>
          )}

          <Dropdown>
            <DropdownTrigger>
              <Button
                // Disable on hover background
                className="data-[hover=true]:bg-transparent"
                isIconOnly
                variant="light"
                onPress={() => {}}
              >
                <Icon name="language" variant="round" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownSection title={t("navigation.language.title")}>
                {Object.entries(languageNames).map(([langCode, langName]) => (
                  <DropdownItem
                    key={langCode}
                    data-is-selected={langCode === locale}
                    onPress={() => {
                      setLocale(langCode as LocaleType);
                    }}
                    className="data-[is-selected=true]:bg-primary/20 data-[is-selected=true]:font-bold"
                  >
                    {langName}
                  </DropdownItem>
                ))}
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>

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
                <DropdownSection showDivider title={t("subscription.title")}>
                  <DropdownItem
                    key={"subscription-plan"}
                    isReadOnly
                    variant="faded"
                  >
                    <div>
                      <p className="text-medium text-center">
                        {t("subscription.plan")}
                      </p>
                      <p className="text-center font-semibold">
                        {subscription?.name}
                      </p>
                      <p className="text-medium text-center">
                        {t("subscription.creditsRemaining")}
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

                <DropdownSection title={t("account.title")} showDivider>
                  <DropdownItem
                    key={"manage-plan"}
                    onPress={() => {
                      const url = getAPIUrl("/pricing");
                      if (getPlatform() === PlatformEnum.Capacitor) {
                        url.searchParams.set(
                          "callbackUrl",
                          process.env.NEXT_PUBLIC_BACKEND_URL + "/api/mobile",
                        );

                        Browser.open({
                          url: url.toString(),
                        });
                      } else if (getPlatform() === PlatformEnum.Electron) {
                        // open in a new external browser window
                        window.open(url.toString(), "_blank");
                      } else {
                        router.replace(url.toString());
                      }
                    }}
                  >
                    {t("subscription.managePlan")}
                  </DropdownItem>
                  <DropdownItem
                    key={"api-keys"}
                    onPress={() => {
                      const url = getAPIUrl("/home/settings/developer");
                      if (getPlatform() === PlatformEnum.Capacitor) {
                        Browser.open({
                          url: url.toString(),
                        });
                      } else {
                        // open in a new external browser window
                        window.open(url.toString(), "_blank");
                      }
                    }}
                  >
                    API Keys
                  </DropdownItem>
                  <DropdownItem
                    key={"sign-out"}
                    onPress={() => {
                      signOut();
                    }}
                    className="text-danger"
                  >
                    {t("common.signOut")}
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
  );
}
