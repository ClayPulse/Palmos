"use client";

import Icon from "@/components/misc/icon";
export default function QuickPillButtons({
  onSend,
}: { onSend: (text: string) => void }) {
  return (
    <>
      <button
        className="flex h-7 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
        onClick={() => onSend("What can you help me with?")}
      >
        <Icon name="help" variant="round" className="text-sm" />
        <span className="hidden text-[11px] font-medium sm:inline">Help</span>
      </button>
      <button
        className="flex h-7 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-50 px-2 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/8 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/15 dark:hover:text-amber-200"
        onClick={() => onSend("Show me examples of Palmos Apps")}
      >
        <Icon name="lightbulb" variant="round" className="text-sm" />
        <span className="hidden text-[11px] font-medium sm:inline">Examples</span>
      </button>
    </>
  );
}
