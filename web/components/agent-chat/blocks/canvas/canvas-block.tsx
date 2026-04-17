"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { CanvasViewConfig } from "@/lib/types";
import type { ChatBlockBaseProps } from "@/components/agent-chat/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useMemo } from "react";

export function CanvasBlock({ data }: ChatBlockBaseProps) {
  const editorContext = useContext(EditorContext);
  const { createCanvasTabView } = useTabViewManager();

  const workflowContent = useMemo(
    () => ({
      nodes: (data.canvas?.nodes ?? []) as any[],
      edges: (data.canvas?.edges ?? []) as any[],
    }),
    [data.canvas],
  );

  function openInNewTab() {
    createCanvasTabView({
      viewId: createCanvasViewId(),
      initialWorkflowContent: workflowContent,
    });
  }

  function applyToActiveTab() {
    const tabViews = editorContext?.editorStates.tabViews;
    const tabIndex = editorContext?.editorStates.tabIndex ?? 0;
    const activeTab = tabViews?.[tabIndex];

    if (activeTab?.type === ViewModeEnum.Canvas) {
      const config = activeTab.config as CanvasViewConfig;
      config.initialWorkflowContent = workflowContent;
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        tabViews: [...prev.tabViews],
      }));
    } else {
      openInNewTab();
    }
  }

  return (
    <div className="my-2 flex items-center gap-2.5 rounded-xl border border-amber-200/60 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
        <Icon name="account_tree" variant="round" className="text-base text-amber-600 dark:text-amber-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-default-700 dark:text-white/85">
          Your workflow is ready.
        </p>
        {data.canvas?.name && (
          <p className="text-[10px] text-default-400 dark:text-white/50">
            {data.canvas.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={applyToActiveTab}
          className="flex items-center gap-1.5 rounded-lg border border-default-200 bg-default-50 px-3 py-1.5 text-xs font-medium text-default-600 transition-colors hover:border-default-300 hover:bg-default-100 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10"
        >
          Preview
        </button>
        <button
          onClick={applyToActiveTab}
          className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:border-amber-400/60 dark:hover:bg-amber-500/20"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
