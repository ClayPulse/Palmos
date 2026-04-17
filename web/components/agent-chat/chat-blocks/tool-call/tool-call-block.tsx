"use client";

import Icon from "@/components/misc/icon";
import { useTranslations } from "@/lib/hooks/use-translations";

export function ToolCallBlock({ names }: { names: string[] }) {
  const { getTranslations: t } = useTranslations();
  if (names.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <Icon name="build" variant="round" className="text-[10px]" />
          {t("messageBubbles.calledTool") + " "}
          {name}
        </span>
      ))}
    </div>
  );
}
