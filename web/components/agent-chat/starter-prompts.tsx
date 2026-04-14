"use client";

import Icon from "@/components/misc/icon";

export const STARTER_PROMPTS = [
  { icon: "contact_phone", label: "Automate my CRM" },
  { icon: "trending_up", label: "Create lead generation" },
  { icon: "language", label: "Make a website" },
  { icon: "dashboard", label: "Create a business dashboard" },
  { icon: "smart_toy", label: "Customize a digital employee" },
  { icon: "inventory_2", label: "Build an inventory tracker" },
];

export function StarterPromptButton({
  prompt,
  onSend,
}: {
  prompt: { icon: string; label: string };
  onSend: (text: string) => void;
}) {
  return (
    <button
      className="group flex min-h-14 items-center gap-2 rounded-xl border border-amber-300/60 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-[0_0_12px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/6 dark:hover:border-amber-500/50 dark:hover:bg-white/10 dark:hover:shadow-[0_0_12px_rgba(251,191,36,0.12)]"
      onClick={() => onSend(prompt.label)}
    >
      <div className="flex shrink-0 items-center justify-center">
        <Icon
          name={prompt.icon}
          className="text-xl leading-none text-amber-600/70 transition-colors group-hover:text-amber-600 dark:text-amber-400/70 dark:group-hover:text-amber-300"
        />
      </div>
      <span className="text-default-700 group-hover:text-default-900 text-sm leading-snug transition-colors dark:text-white/70 dark:group-hover:text-white/90">
        {prompt.label}
      </span>
    </button>
  );
}
