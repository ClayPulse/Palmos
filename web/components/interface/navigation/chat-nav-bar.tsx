"use client";

import Icon from "@/components/misc/icon";
import { ViewAsModal } from "@/components/misc/view-as-user-picker";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
import useRouter from "@/lib/hooks/use-router";
import {
  languageNames,
  LocaleType,
  useTranslations,
} from "@/lib/hooks/use-translations";
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
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useContext, useState } from "react";

export function ChatNavLeft({
  onToggleSidebar,
  isSidebarOpen,
}: {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-default-500 transition-colors hover:bg-default-100 dark:text-white/60 dark:hover:bg-white/10"
        >
          <Icon
            name={isSidebarOpen ? "menu_open" : "menu"}
            variant="round"
            className="text-xl"
          />
        </button>
      )}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 no-underline"
      >
      <motion.span
        className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
        animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Icon name="bolt" className="text-xl" />
      </motion.span>
      <motion.span
        className="bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-base font-bold tracking-wide text-transparent dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
        animate={{ backgroundPosition: ["200% 50%", "0% 50%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        PALMOS AI
      </motion.span>
    </a>
    </div>
  );
}

export function ChatNavRight() {
  const editorContext = useContext(EditorContext);
  const { session, signOut, subscription, usage } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { getTranslations: t, locale, setLocale } = useTranslations();
  const router = useRouter();
  const [isViewAsOpen, setIsViewAsOpen] = useState(false);

  return (
    <div className="flex items-center gap-x-1">
      <Button
        className="data-[hover=true]:bg-transparent"
        isIconOnly
        variant="light"
        onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {resolvedTheme === "dark" ? (
          <Icon name="dark_mode" variant="round" />
        ) : (
          <Icon name="light_mode" variant="round" />
        )}
      </Button>

      {!session && (
        <Button
          onPress={() =>
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isSigningIn: true,
            }))
          }
        >
          {t("common.signIn")}
        </Button>
      )}

      <Dropdown>
        <DropdownTrigger>
          <Button
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
                onPress={() => setLocale(langCode as LocaleType)}
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
                    Browser.open({ url: url.toString() });
                  } else if (getPlatform() === PlatformEnum.Electron) {
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
                    Browser.open({ url: url.toString() });
                  } else {
                    window.open(url.toString(), "_blank");
                  }
                }}
              >
                API Keys
              </DropdownItem>
              {session.user.isAdmin && (
                <DropdownItem
                  key={"view-as"}
                  startContent={<Icon name="visibility" className="text-sm" />}
                  onPress={() => setIsViewAsOpen(true)}
                  className="text-warning"
                >
                  View as User
                </DropdownItem>
              )}
              <DropdownItem
                key={"sign-out"}
                onPress={() => signOut()}
                className="text-danger"
              >
                {t("common.signOut")}
              </DropdownItem>
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      )}
      {session?.user.isAdmin && (
        <ViewAsModal
          isOpen={isViewAsOpen}
          onClose={() => setIsViewAsOpen(false)}
          isAdmin
        />
      )}
    </div>
  );
}
