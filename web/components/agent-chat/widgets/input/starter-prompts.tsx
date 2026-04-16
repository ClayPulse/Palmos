"use client";

import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";

export const STARTER_PROMPTS = [
  { icon: "contact_phone", labelKey: "starterPrompts.automateCRM" },
  { icon: "trending_up", labelKey: "starterPrompts.leadGeneration" },
  { icon: "language", labelKey: "starterPrompts.makeWebsite" },
  { icon: "dashboard", labelKey: "starterPrompts.businessDashboard" },
  { icon: "smart_toy", labelKey: "starterPrompts.digitalEmployee" },
  { icon: "inventory_2", labelKey: "starterPrompts.inventoryTracker" },
];

export function StarterPromptButton({
  prompt,
  onSend,
}: {
  prompt: { icon: string; labelKey: string };
  onSend: (text: string) => void;
}) {
  const { getTranslations: t } = useTranslations();

  return (
    <button
      className="group flex min-h-14 items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_0_12px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/6 dark:hover:border-amber-500/50 dark:hover:bg-white/10 dark:hover:shadow-[0_0_12px_rgba(251,191,36,0.12)]"
      onClick={() => onSend(t(prompt.labelKey))}
    >
      <div className="flex shrink-0 items-center justify-center">
        <Icon
          name={prompt.icon}
          className="text-xl leading-none text-amber-600/70 transition-colors group-hover:text-amber-600 dark:text-amber-400/70 dark:group-hover:text-amber-300"
        />
      </div>
      <span className="text-default-700 group-hover:text-default-900 text-sm leading-snug transition-colors dark:text-white/70 dark:group-hover:text-white/90">
        {t(prompt.labelKey)}
      </span>
    </button>
  );
}
