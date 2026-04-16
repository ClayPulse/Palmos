"use client";

import Icon from "@/components/misc/icon";
import WorkflowDetailsModal from "@/components/interface/workflow-details-modal";
import WorkflowEnvSetupModal from "@/components/modals/workflow-env-setup-modal";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkflowEnvCheck } from "@/lib/hooks/use-workflow-env-check";
import type { Automation, TriggerType, Workflow } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { Button, Chip } from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useContext, useState } from "react";

export function MyWorkflowsCarousel({ workflows, onMutate, projectId }: { workflows: Workflow[]; onMutate?: () => void; projectId?: string }) {
  const { getTranslations: t } = useTranslations();
  const ITEMS_PER_PAGE = 3;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(workflows.length / ITEMS_PER_PAGE);
  const visible = workflows.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );
  const { createCanvasTabView } = useTabViewManager();
  const editorContext = useContext(EditorContext);
  const { envSetup, checkMissingEnvs, openEnvSetup, closeEnvSetup } =
    useWorkflowEnvCheck();
  const [pendingWorkflow, setPendingWorkflow] = useState<Workflow | null>(null);
  const [detailsWorkflow, setDetailsWorkflow] = useState<Workflow | null>(null);

  async function proceedToCanvas(workflow: Workflow) {
    await createCanvasTabView(
      {
        viewId: createCanvasViewId(),
        appConfigs: workflow.content.nodes.map((node) => node.data.config),
        initialWorkflowContent: workflow.content,
      },
      workflow,
    );
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Editor,
    }));
  }

  async function openWorkflow(workflow: Workflow) {
    const missing = await checkMissingEnvs(workflow.id);
    if (missing && workflow.id) {
      setPendingWorkflow(workflow);
      openEnvSetup(workflow.id, missing);
    } else {
      await proceedToCanvas(workflow);
    }
  }

  return (
    <div className="w-full max-w-xl shrink-0 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-default-500 text-xs font-medium tracking-wide uppercase">
          {t("carousels.myWorkflows")}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-default-400 hover:text-default-700 relative z-10 flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-30"
              disabled={page === 0}
              onClick={(e) => {
                e.stopPropagation();
                setPage((p) => p - 1);
              }}
            >
              ‹
            </button>
            <span className="text-default-400 text-xs select-none">
              {page + 1}/{totalPages}
            </span>
            <button
              type="button"
              className="text-default-400 hover:text-default-700 relative z-10 flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-30"
              disabled={page === totalPages - 1}
              onClick={(e) => {
                e.stopPropagation();
                setPage((p) => p + 1);
              }}
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {visible.map((wf) => (
          <div
            key={wf.id ?? wf.name}
            className="bg-content2 border-divider flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{wf.name}</p>
              {wf.description && (
                <p className="text-default-500 mt-0.5 truncate text-xs">
                  {wf.description}
                </p>
              )}
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              <Chip size="sm" variant="flat">
                v{wf.version}
              </Chip>
              <Button
                size="sm"
                variant="flat"
                onPress={() => setDetailsWorkflow(wf)}
                startContent={<Icon name="info" className="text-sm" />}
              >
                Details
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="primary"
                startContent={<Icon name="open_in_new" className="text-sm" />}
                onPress={() => openWorkflow(wf)}
              >
                {t("carousels.open")}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {envSetup && (
        <WorkflowEnvSetupModal
          isOpen={envSetup.isOpen}
          onClose={() => {
            closeEnvSetup();
            setPendingWorkflow(null);
          }}
          onComplete={async () => {
            closeEnvSetup();
            if (pendingWorkflow) {
              await proceedToCanvas(pendingWorkflow);
              setPendingWorkflow(null);
            }
          }}
          workflowId={envSetup.workflowId}
          envEntries={envSetup.env}
        />
      )}
      {detailsWorkflow && (
        <WorkflowDetailsModal
          workflow={{ ...detailsWorkflow, projectId: detailsWorkflow.projectId ?? projectId ?? null }}
          isOpen={!!detailsWorkflow}
          onClose={() => setDetailsWorkflow(null)}
          onDelete={onMutate}
        />
      )}
    </div>
  );
}

// ── My Automations Carousel ─────────────────────────────────────────────────

export const AUTOMATION_TRIGGER_ICONS: Record<TriggerType, string> = {
  schedule: "schedule",
  webhook: "link",
  manual: "play_arrow",
  agentic: "bolt",
};

export const AUTOMATION_TRIGGER_LABELS: Record<TriggerType, string> = {
  schedule: "Scheduled",
  webhook: "Webhook",
  manual: "Manual",
  agentic: "Agentic",
};

export const AUTOMATION_STATUS_COLORS: Record<
  string,
  "default" | "primary" | "danger"
> = {
  idle: "default",
  running: "primary",
  error: "danger",
};

export function MyAutomationsCarousel({
  automations,
  onOpenEditor,
  onCreateNew,
}: {
  automations: Automation[];
  onOpenEditor: (automation: Automation) => void;
  onCreateNew: () => void;
}) {
  const { getTranslations: t } = useTranslations();
  const ITEMS_PER_PAGE = 3;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(automations.length / ITEMS_PER_PAGE);
  const visible = automations.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE,
  );

  return (
    <div className="w-full max-w-xl shrink-0 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-default-500 text-xs font-medium tracking-wide uppercase">
            {t("carousels.myAutomations")}
          </p>
          {automations.some((a) => a.status === "running") && (
            <Chip
              size="sm"
              color="primary"
              variant="dot"
              classNames={{ content: "text-xs" }}
            >
              {automations.filter((a) => a.status === "running").length} {t("carousels.running")}
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            startContent={<Icon name="add" className="text-xs" />}
            onPress={onCreateNew}
            className="h-6 min-w-0 px-2 text-xs"
          >
            {t("carousels.new")}
          </Button>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="text-default-400 hover:text-default-700 relative z-10 flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-30"
                disabled={page === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setPage((p) => p - 1);
                }}
              >
                ‹
              </button>
              <span className="text-default-400 text-xs select-none">
                {page + 1}/{totalPages}
              </span>
              <button
                type="button"
                className="text-default-400 hover:text-default-700 relative z-10 flex h-8 w-8 items-center justify-center transition-colors disabled:opacity-30"
                disabled={page === totalPages - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setPage((p) => p + 1);
                }}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {automations.length === 0 ? (
        <button
          type="button"
          onClick={onCreateNew}
          className="bg-content2 border-divider hover:bg-content3 flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors"
        >
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
            <Icon name="smart_toy" className="text-primary text-sm" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{t("carousels.createFirstAutomation")}</p>
            <p className="text-default-500 mt-0.5 text-xs">
              {t("carousels.scheduleWorkflows")}
            </p>
          </div>
          <Icon
            name="arrow_forward"
            className="text-default-400 ml-auto text-sm"
          />
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((automation) => (
            <div
              key={automation.id}
              className="bg-content2 border-divider flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon
                    name={
                      AUTOMATION_TRIGGER_ICONS[automation.triggerType] ??
                      "smart_toy"
                    }
                    variant="round"
                    className="text-default-400 text-sm"
                  />
                  <p className="truncate text-sm font-medium">
                    {automation.name}
                  </p>
                  <Chip
                    size="sm"
                    color={
                      AUTOMATION_STATUS_COLORS[automation.status] ?? "default"
                    }
                    variant={automation.status === "running" ? "dot" : "flat"}
                    classNames={{ content: "text-xs" }}
                  >
                    {automation.status}
                  </Chip>
                </div>
                <p className="text-default-500 mt-0.5 truncate pl-6 text-xs">
                  {automation.workflowName} ·{" "}
                  {AUTOMATION_TRIGGER_LABELS[automation.triggerType] ??
                    automation.triggerType}
                  {automation.lastRun
                    ? ` · ${automation.lastRun.creditsConsumed.toFixed(2)} credits`
                    : ""}
                </p>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                {!automation.enabled && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="warning"
                    classNames={{ content: "text-xs" }}
                  >
                    {t("carousels.paused")}
                  </Chip>
                )}
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  startContent={<Icon name="edit" className="text-sm" />}
                  onPress={() => onOpenEditor(automation)}
                >
                  {t("carousels.edit")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
