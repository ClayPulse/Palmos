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
    <div className="flex h-full w-full flex-col bg-gray-50 pt-16 dark:bg-[#0d0d14]">
      <div className="flex flex-col overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center gap-6 px-4 py-10 sm:px-8">
          {/* Template gallery */}
          <TemplateLibrary onSend={onSelectTemplate} variant="hero" />

          {/* Custom workflow CTA */}
          <div className="w-full max-w-3xl">
            <div className="border-default-300 from-default-50 to-default-100/50 rounded-2xl border border-dashed bg-gradient-to-br p-6 text-center dark:border-white/10 dark:from-white/3 dark:to-white/[0.02]">
              <div className="mb-3 flex justify-center">
                <div className="bg-default-100 flex h-11 w-11 items-center justify-center rounded-full dark:bg-white/10">
                  <Icon
                    name="auto_fix_high"
                    variant="round"
                    className="text-default-600 text-2xl dark:text-white/70"
                  />
                </div>
              </div>
              <h3 className="text-default-800 text-base font-semibold dark:text-white/90">
                Can&apos;t find what you need?
              </h3>
              <p className="text-default-500 mx-auto mt-1.5 max-w-md text-sm dark:text-white/50">
                Build a custom workflow in ~15 minutes with our AI assistant
              </p>
              <Button
                className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:shadow-lg hover:shadow-amber-500/30"
                size="md"
                onPress={onBuildCustom}
                startContent={
                  <Icon name="build" variant="round" className="text-base" />
                }
              >
                Build Custom Workflow
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
