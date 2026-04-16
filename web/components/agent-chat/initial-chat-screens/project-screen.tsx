"use client";

import { MyAutomationsCarousel, MyWorkflowsCarousel } from "@/components/agent-chat/carousels";
import { STARTER_PROMPTS, StarterPromptButton } from "@/components/agent-chat/starter-prompts";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAutomations } from "@/lib/hooks/use-automations";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { ProjectInfo } from "@/lib/types";
import { Spinner } from "@heroui/react";
import { useContext, useState } from "react";

const PROJECT_CATEGORIES = [
  { labelKey: "projectScreen.categoryMarketing", icon: "campaign" },
  { labelKey: "projectScreen.categorySales", icon: "handshake" },
  { labelKey: "projectScreen.categorySupport", icon: "support_agent" },
  { labelKey: "projectScreen.categoryOperations", icon: "settings" },
  { labelKey: "projectScreen.categoryEcommerce", icon: "shopping_cart" },
  { labelKey: "projectScreen.categoryContent", icon: "edit_note" },
  { labelKey: "projectScreen.categoryData", icon: "analytics" },
] as const;

interface ProjectScreenProps {
  onSend: (text: string) => void;
  project: ProjectInfo;
}

export default function ProjectScreen({ onSend, project }: ProjectScreenProps) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);
  const { workflows: myWorkflows, isLoading: isLoadingMyWorkflows } =
    useMarketplaceWorkflows("My Workflows", project.id);
  const { automations, isLoading: isLoadingAutomations } = useAutomations();
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const activeAutomations = automations.filter((a) => a.enabled);
  const workflowCount = myWorkflows?.length ?? 0;
  const showNudge = !nudgeDismissed && project.onboardingCompleted === false;

  function handleCategoryPick(categoryLabel: string) {
    setNudgeDismissed(true);
    onSend(
      `My project is about: ${categoryLabel}. Please update the project description and suggest some automations I can build for it.`,
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Status banner — always shown */}
      <div className="w-full max-w-xl rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/5">
        <div className="flex items-start gap-4">
          <div className="animate-pulse-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 p-2 dark:bg-amber-500/15">
            <img src="/assets/pulse-logo.svg" alt="Palmos" className="h-full w-full" />
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

      {/* Onboarding nudge — separate card */}
      {showNudge && (
        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/5">
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 p-2 dark:bg-amber-500/15">
              <img src="/assets/pulse-logo.svg" alt="Palmos" className="h-full w-full" />
            </div>
            <div>
              <h2 className="text-default-800 text-base font-semibold dark:text-white/90">
                {t("projectScreen.tellAboutProject")}
              </h2>
              <p className="text-default-500 mt-0.5 text-sm dark:text-white/50">
                {t("projectScreen.helpUnderstand")}
              </p>
            </div>
          </div>
          <div className="border-t border-amber-200/50 bg-white/60 px-5 py-3.5 dark:border-amber-500/10 dark:bg-white/3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-default-600 dark:text-white/60">
                {t("projectScreen.whatKind")}
              </p>
              <button
                onClick={() => setNudgeDismissed(true)}
                className="text-[10px] text-default-400 hover:text-default-600 dark:text-white/35 dark:hover:text-white/55"
              >
                {t("projectScreen.skip")}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_CATEGORIES.map((cat) => (
                <button
                  key={cat.labelKey}
                  onClick={() => handleCategoryPick(t(cat.labelKey))}
                  className="flex items-center gap-1.5 rounded-lg border border-default-200/60 bg-white px-2.5 py-1.5 text-xs font-medium text-default-700 transition-colors hover:border-amber-300/60 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:border-amber-500/25 dark:hover:bg-amber-500/5"
                >
                  <Icon
                    name={cat.icon}
                    variant="round"
                    className="text-xs text-amber-600 dark:text-amber-400"
                  />
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Starter prompts */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {STARTER_PROMPTS.map((prompt) => (
          <StarterPromptButton key={prompt.labelKey} prompt={prompt} onSend={onSend} />
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
          <MyWorkflowsCarousel workflows={myWorkflows} />
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
    <div className="mt-1.5 flex items-center gap-3 text-xs text-default-500 dark:text-white/50">
      <span className="font-medium text-green-600 dark:text-green-400">{t("projectScreen.allSystemsNominal")}</span>
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
