"use client";

import { MyAutomationsCarousel } from "@/components/agent-chat/chat-screens/carousels/my-automations-carousel";
import { MyWorkflowsCarousel } from "@/components/agent-chat/chat-screens/carousels/my-workflows-carousel";
import {
  STARTER_PROMPTS,
  StarterPromptButton,
} from "@/components/agent-chat/input/starter-prompts";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAutomations } from "@/lib/hooks/use-automations";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { ProjectInfo } from "@/lib/types";
import { Spinner } from "@heroui/react";
import { useContext } from "react";

export default function ProjectScreen({
  onSend,
  project,
}: {
  onSend: (text: string) => void;
  project: ProjectInfo;
}) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);
  const {
    workflows: myWorkflows,
    isLoading: isLoadingMyWorkflows,
    mutate: mutateWorkflows,
  } = useMarketplaceWorkflows("My Workflows", project.id);
  const { automations, isLoading: isLoadingAutomations } = useAutomations();

  const activeAutomations = automations.filter((a) => a.enabled);
  const workflowCount = myWorkflows?.length ?? 0;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Status banner — always shown */}
      <div className="w-full max-w-xl rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/5">
        <div className="flex items-start gap-4">
          <div className="animate-pulse-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 p-2 dark:bg-amber-500/15">
            <img
              src="/assets/pulse-logo.svg"
              alt="Palmos"
              className="h-full w-full"
            />
          </div>
          <div>
            <h2 className="text-default-800 text-base font-semibold dark:text-white/90">
              {t("projectScreen.whatToWorkOn")}
            </h2>
            <StatusLine
              activeAutomations={activeAutomations.length}
              workflowCount={workflowCount}
            />
          </div>
        </div>
      </div>

      {/* Starter prompts */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {STARTER_PROMPTS.map((prompt) => (
          <StarterPromptButton
            key={prompt.labelKey}
            prompt={prompt}
            onSend={onSend}
          />
        ))}
      </div>

      {/* Automations */}
      <div className="w-full max-w-xl">
        {isLoadingAutomations ? (
          <div className="flex items-center justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : (
          <MyAutomationsCarousel
            automations={automations}
            onOpenEditor={(automation) => {
              editorContext?.updateModalStates({
                automationEditor: { isOpen: true, automation },
              });
            }}
            onCreateNew={() => {
              editorContext?.updateModalStates({
                automationEditor: { isOpen: true },
              });
            }}
          />
        )}
      </div>

      {/* Workflows */}
      <div className="w-full max-w-xl">
        {isLoadingMyWorkflows ? (
          <div className="flex items-center justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : myWorkflows && myWorkflows.length > 0 ? (
          <MyWorkflowsCarousel
            workflows={myWorkflows}
            onMutate={() => mutateWorkflows()}
            projectId={project.id}
          />
        ) : null}
      </div>
    </div>
  );
}

function StatusLine({
  activeAutomations,
  workflowCount,
}: {
  activeAutomations: number;
  workflowCount: number;
}) {
  const { getTranslations: t } = useTranslations();

  if (activeAutomations === 0 && workflowCount === 0) {
    return (
      <p className="text-default-500 mt-0.5 text-sm dark:text-white/50">
        {t("projectScreen.describeIdea")}
      </p>
    );
  }

  return (
    <div className="text-default-500 mt-1.5 flex items-center gap-3 text-xs dark:text-white/50">
      <span className="font-medium text-green-600 dark:text-green-400">
        {t("projectScreen.allSystemsNominal")}
      </span>
      {activeAutomations > 0 && (
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          {t("projectScreen.automationsActive", { count: activeAutomations })}
        </span>
      )}
      {workflowCount > 0 && (
        <span>
          {t("projectScreen.workflowsReady", { count: workflowCount })}
        </span>
      )}
    </div>
  );
}
