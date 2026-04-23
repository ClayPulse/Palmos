"use client";

import { TemplateLibrary } from "@/components/agent-chat/chat-screens/template-library";
import Icon from "@/components/misc/icon";
import { Button } from "@heroui/react";

export default function HomeView({
  onSelectTemplate,
  onBuildCustom,
}: {
  onSelectTemplate: (prompt: string) => void;
  onBuildCustom: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-gray-50 pt-12 dark:bg-[#0d0d14]">
      {/* Template gallery fills the space with its own scroll */}
      <TemplateLibrary onSend={onSelectTemplate} variant="hero" />

      {/* Fixed bottom CTA bar */}
      <div className="shrink-0 border-t border-default-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-white/8 dark:bg-[#0d0d14]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name="auto_fix_high" variant="round" className="text-lg text-default-500 shrink-0 dark:text-white/50" />
            <p className="text-default-600 text-sm truncate dark:text-white/60">
              Can&apos;t find what you need? Build a custom workflow in ~15 min
            </p>
          </div>
          <Button
            className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md shadow-amber-500/20"
            size="sm"
            onPress={onBuildCustom}
            startContent={<Icon name="build" variant="round" className="text-sm" />}
          >
            Build Custom
          </Button>
        </div>
      </div>
    </div>
  );
}
