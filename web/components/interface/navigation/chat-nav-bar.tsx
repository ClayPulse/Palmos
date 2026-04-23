"use client";

import ShareChatModal from "@/components/modals/share-chat-modal";
import Icon from "@/components/misc/icon";
import { ViewAsModal } from "@/components/misc/view-as-user-picker";
import { useInbox } from "@/components/agent-chat/panels/inbox-panel";
import { formatRelativeTime } from "@/components/agent-chat/helpers";
import { useChatContext } from "@/components/providers/chat-provider";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@heroui/react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useContext, useState } from "react";

export function ChatNavLeft({
  onToggleSidebar,
  isSidebarOpen,
  showHome,
  onHome,
}: {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  showHome?: boolean;
  onHome?: () => void;
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
      {showHome && onHome && (
        <Tooltip content="Home" delay={400} closeDelay={0}>
          <button
            onClick={onHome}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-default-500 transition-colors hover:bg-default-100 dark:text-white/60 dark:hover:bg-white/10"
          >
            <Icon name="home" variant="round" className="text-xl" />
          </button>
        </Tooltip>
      )}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 no-underline"
      >
      <Image
        src="/assets/pulse-logo.svg"
        alt="Palmos"
        width={24}
        height={24}
        className="shrink-0"
      />
      <motion.span
        className="hidden bg-linear-to-r from-amber-600 via-amber-400 to-amber-600 bg-size-[200%_100%] bg-clip-text text-base font-bold tracking-wide text-transparent sm:inline dark:from-amber-500 dark:via-amber-200 dark:to-amber-500"
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
  const { messages: inboxMessages, unreadCount, markAllRead, dismiss: dismissInbox } = useInbox();
  const { currentSessionIdRef, messages: chatMessages } = useChatContext();
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <div className="flex items-center gap-x-0.5 md:gap-x-1">
      {/* Share chat modal */}
      <ShareChatModal
        sessionId={currentSessionIdRef.current}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {/* Share */}
      {session && currentSessionIdRef.current && chatMessages.length > 0 && (
        <Tooltip content="Share chat" delay={400} closeDelay={0}>
          <Button
            className="data-[hover=true]:bg-transparent"
            isIconOnly
            size="sm"
            variant="light"
            isDisabled={!currentSessionIdRef.current}
            onPress={() => setIsShareOpen(true)}
          >
            <Icon name="share" variant="round" />
          </Button>
        </Tooltip>
      )}

      {/* Inbox */}
      {session && (
        <Popover placement="bottom-end" onOpenChange={(open) => { if (open) markAllRead(); }}>
          <PopoverTrigger>
            <Button
              className="relative data-[hover=true]:bg-transparent"
              isIconOnly
              size="sm"
              variant="light"
            >
              <Icon name="notifications" variant="round" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                  <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 animate-ping rounded-full bg-red-400 opacity-75" />
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <div className="flex items-center gap-2 border-b border-default-200 px-3 py-2.5 dark:border-white/8">
              <Icon name="notifications" variant="round" className="text-base text-amber-500 dark:text-amber-400" />
              <span className="text-sm font-semibold text-default-700 dark:text-white/80">Inbox</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {inboxMessages.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Icon name="notifications_none" variant="round" className="mb-1.5 text-2xl text-default-300 dark:text-white/20" />
                  <p className="text-xs text-default-500 dark:text-white/40">No notifications yet</p>
                </div>
              ) : (
                [...inboxMessages].reverse().map((msg) => {
                  const kwargs = msg.additionalKwargs;
                  const isWorkflowBuild = kwargs?.type === "workflow_build_complete";
                  return (
                    <div key={msg.id} className="group border-b border-default-100 px-3 py-2.5 last:border-b-0 dark:border-white/5">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isWorkflowBuild ? "bg-green-100 dark:bg-green-500/15" : "bg-amber-100 dark:bg-amber-500/15"}`}>
                          <Icon
                            name={isWorkflowBuild ? "rocket_launch" : "notifications"}
                            variant="round"
                            className={`text-xs ${isWorkflowBuild ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-default-700 dark:text-white/75">{msg.content}</p>
                          <p className="mt-0.5 text-[10px] text-default-400 dark:text-white/30">
                            {formatRelativeTime(msg.createdAt, t)}
                          </p>
                          {isWorkflowBuild && kwargs?.workflowId && (
                            <button
                              onClick={() => {
                                const url = new URL(window.location.href);
                                url.searchParams.set("workflowId", kwargs.workflowId);
                                url.searchParams.set("run", "true");
                                window.location.href = url.toString();
                              }}
                              className="mt-1.5 flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                            >
                              <Icon name="play_arrow" variant="round" className="text-xs" />
                              Try Workflow
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => dismissInbox(msg.id)}
                          className="shrink-0 text-default-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-default-500 dark:text-white/20 dark:hover:text-white/50"
                        >
                          <Icon name="close" variant="round" className="text-sm" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Connect / Platforms dropdown */}
      <Dropdown>
        <DropdownTrigger>
          <Button
            className="data-[hover=true]:bg-transparent"
            isIconOnly
            size="sm"
            variant="light"
          >
            <Icon name="download" variant="round" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownSection title="Use Palmos on">
            <DropdownItem
              key="web"
              startContent={<Icon name="language" variant="round" className="text-sm" />}
              onPress={() => window.open("https://web.palmos.ai", "_blank")}
            >
              Web App
            </DropdownItem>
            <DropdownItem
              key="desktop"
              startContent={<Icon name="computer" variant="round" className="text-sm" />}
              onPress={() => window.open("https://github.com/claypulse/pulse-editor/releases/latest", "_blank")}
            >
              Desktop
            </DropdownItem>
            <DropdownItem
              key="android"
              startContent={<Icon name="phone_android" variant="round" className="text-sm" />}
              onPress={() => window.open("https://play.google.com/store/apps/details?id=com.pulse_editor.app", "_blank")}
            >
              Android
            </DropdownItem>
            <DropdownItem
              key="cli"
              startContent={<Icon name="terminal" variant="round" className="text-sm" />}
              onPress={() => window.open("https://www.npmjs.com/package/@pulse-editor/cli", "_blank")}
            >
              CLI
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title="Connect via messaging">
            <DropdownItem
              key="whatsapp"
              startContent={<Image src="/assets/im-icons/whatsapp.svg" alt="WhatsApp" width={16} height={16} className="shrink-0 dark:invert" />}
              onPress={() => window.open("https://im.palmos.ai", "_blank")}
            >
              WhatsApp
            </DropdownItem>
            <DropdownItem
              key="discord"
              startContent={<Image src="/assets/im-icons/discord.svg" alt="Discord" width={16} height={16} className="shrink-0 dark:invert" />}
              onPress={() => window.open("https://im.palmos.ai", "_blank")}
            >
              Discord
            </DropdownItem>
            <DropdownItem
              key="telegram"
              startContent={<Image src="/assets/im-icons/telegram.svg" alt="Telegram" width={16} height={16} className="shrink-0 dark:invert" />}
              onPress={() => window.open("https://im.palmos.ai", "_blank")}
            >
              Telegram
            </DropdownItem>
            <DropdownItem
              key="slack"
              startContent={<Image src="/assets/im-icons/slack.svg" alt="Slack" width={16} height={16} className="shrink-0 dark:invert" />}
              onPress={() => window.open("https://im.palmos.ai", "_blank")}
            >
              Slack
            </DropdownItem>
            <DropdownItem
              key="more-im"
              startContent={<Icon name="more_horiz" variant="round" className="text-sm" />}
              description="LINE, Teams, Signal, WeChat & more"
              onPress={() => window.open("https://im.palmos.ai", "_blank")}
            >
              More Platforms
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      <Button
        className="data-[hover=true]:bg-transparent"
        isIconOnly
        size="sm"
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
          size="sm"
          isIconOnly
          variant="light"
          className="md:hidden"
          onPress={() =>
            editorContext?.setEditorStates((prev) => ({
              ...prev,
              isSigningIn: true,
            }))
          }
        >
          <Icon name="login" variant="round" />
        </Button>
      )}
      {!session && (
        <Button
          size="sm"
          className="hidden md:flex"
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
            size="sm"
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
              <DropdownItem
                key={"sign-out"}
                onPress={() => signOut()}
                className="text-danger"
              >
                {t("common.signOut")}
              </DropdownItem>
            </DropdownSection>
            {session.user.isAdmin ? (
              <DropdownSection title="Admin">
                <DropdownItem
                  key={"view-as"}
                  startContent={<Icon name="visibility" className="text-sm" />}
                  onPress={() => setIsViewAsOpen(true)}
                  className="text-warning"
                >
                  View as User
                </DropdownItem>
              </DropdownSection>
            ) : (
              <DropdownSection className="hidden">
                <DropdownItem key={"view-as-hidden"} className="hidden">
                  {null}
                </DropdownItem>
              </DropdownSection>
            )}
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
