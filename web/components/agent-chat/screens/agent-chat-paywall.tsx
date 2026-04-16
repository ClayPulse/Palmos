"use client";

import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";
import { getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { Button } from "@heroui/react";
import Image from "next/image";

export default function AgentChatPaywall() {
  const { getTranslations: t } = useTranslations();
  function handleViewPlans() {
    const url = getAPIUrl("/pricing");
    window.open(url.toString(), "_blank");
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/15">
        <Image
          src="/assets/pulse-logo.svg"
          alt="Palmos"
          width={36}
          height={36}
        />
      </div>

      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-default-800 dark:text-white/90">
          {t("agentChatPaywall.upgradeTitle")}
        </h2>
        <p className="text-sm text-default-500 dark:text-white/50">
          {t("agentChatPaywall.upgradeDescription")}
        </p>
      </div>

      <Button
        color="primary"
        className="bg-gradient-to-r from-amber-500 to-orange-500 font-medium text-white"
        onPress={handleViewPlans}
        startContent={<Icon name="rocket_launch" variant="round" className="text-base" />}
      >
        {t("agentChatPaywall.viewPlans")}
      </Button>

      <p className="max-w-xs text-center text-xs text-default-400 dark:text-white/30">
        {t("agentChatPaywall.alreadyMember")}
      </p>
    </div>
  );
}
