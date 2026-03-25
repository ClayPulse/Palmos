"use client";

import WorkflowPreviewCard from "@/components/cards/workflow-preview-card";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { Workflow } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { Spinner } from "@heroui/react";
import { useContext } from "react";
import { isMobile } from "@/lib/platform-api/platform-checker";

export default function WorkflowExplorer() {
  const editorContext = useContext(EditorContext);
  const { createCanvasTabView } = useTabViewManager();
  const { workflows, isLoading } = useMarketplaceWorkflows("Published by Me");

  async function openWorkflow(workflow: Workflow) {
    if (isMobile()) {
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isSideMenuOpen: false,
      }));
    }

    await createCanvasTabView(
      {
        viewId: createCanvasViewId(),
        appConfigs: workflow.content.nodes.map((node) => node.data.config),
        initialWorkflowContent: workflow.content,
      },
      workflow,
    );
  }

  return (
    <div className="grid h-full grid-rows-[max-content_auto] gap-y-2">
      <p className="text-center font-semibold text-lg">My Workflows</p>

      <div className="grid h-fit max-h-full w-full grid-cols-1 gap-2 overflow-x-hidden overflow-y-auto px-4">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}

        {!isLoading && workflows?.length === 0 && (
          <p className="text-default-foreground/50 py-4 text-center text-sm">
            No workflows published yet.
          </p>
        )}

        {workflows?.map((wf, index) => (
          <WorkflowPreviewCard
            key={index}
            workflow={wf}
            onPress={openWorkflow}
          />
        ))}
      </div>
    </div>
  );
}
