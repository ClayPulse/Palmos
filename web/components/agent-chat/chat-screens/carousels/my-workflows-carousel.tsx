"use client";

import Icon from "@/components/misc/icon";
import WorkflowDetailsModal from "@/components/modals/workflow-details-modal";
import WorkflowEnvSetupModal from "@/components/modals/workflow-env-setup-modal";
import { useChatContext } from "@/components/providers/chat-provider";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { useWorkflowEnvCheck } from "@/lib/hooks/use-workflow-env-check";
import type { Workflow } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { Button, Chip } from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { ReactNode } from "react";
import { useContext, useState } from "react";

export function MyWorkflowsCarousel({ workflows, onMutate, projectId, showAllToggle, showProjectName }: {
  workflows: Workflow[];
  onMutate?: () => void;
  projectId?: string;
  showAllToggle?: ReactNode;
  showProjectName?: boolean;
}) {
  const { getTranslations: t } = useTranslations();
  const { submit } = useChatContext();
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

  function runWorkflow(workflow: Workflow) {
    submit(`Run my workflow "${workflow.name}"`);
  }

  async function openWorkflow(workflow: Workflow) {
    const result = await checkMissingEnvs(workflow.id);
    if (result && workflow.id) {
      setPendingWorkflow(workflow);
      openEnvSetup(workflow.id, result.missing, result.managedAvailable);
    } else {
      await proceedToCanvas(workflow);
    }
  }

  return (
    <div className="w-full max-w-xl shrink-0 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-default-500 text-xs font-medium tracking-wide uppercase">
            {t("carousels.myWorkflows")}
          </p>
          {showAllToggle}
        </div>
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
              <div className="flex items-center gap-2">
                {showProjectName && wf.project?.name && (
                  <Chip size="sm" variant="flat" color="secondary" startContent={<Icon name="folder" className="text-xs" />} className="shrink-0">
                    {wf.project.name}
                  </Chip>
                )}
                <p className="truncate text-sm font-medium">{wf.name}</p>
              </div>
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
                color="success"
                startContent={<Icon name="play_arrow" className="text-sm" />}
                onPress={() => runWorkflow(wf)}
              >
                Run
              </Button>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                onPress={() => setDetailsWorkflow(wf)}
              >
                <Icon name="info" className="text-sm" />
              </Button>
              <Button
                size="sm"
                variant="light"
                color="primary"
                isIconOnly
                onPress={() => openWorkflow(wf)}
              >
                <Icon name="open_in_new" className="text-sm" />
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
          managedAvailable={envSetup.managedAvailable}
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
