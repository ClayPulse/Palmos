"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { AppViewConfig } from "@/lib/types";
import type { ChatBlockData } from "@/lib/types";
import { createAppViewId } from "@/lib/views/view-helpers";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useMemo } from "react";

export function PulseAppBlock({
  data,
}: { data: Extract<ChatBlockData, { type: "pulse-app" }> }) {
  const editorContext = useContext(EditorContext);
  const appId = data.appId;
  const { marketplaceExtensions } = useExtensionAppManager("All");

  const ext = useMemo(
    () => marketplaceExtensions?.find((e) => e.config.id === appId),
    [marketplaceExtensions, appId],
  );

  function openInEditor() {
    if (!appId || !editorContext) return;
    const viewId = createAppViewId(appId);
    const appConfig: AppViewConfig = { viewId, app: appId };
    editorContext.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Editor,
      tabViews: [
        ...prev.tabViews,
        { type: ViewModeEnum.App, config: appConfig },
      ],
      tabIndex: prev.tabViews.length,
    }));
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-white/10 dark:bg-white/6">
      <div className="flex items-center gap-2 border-b border-amber-200/40 bg-amber-50/50 px-3 py-1.5 dark:border-white/6 dark:bg-amber-500/5">
        <Icon
          name="apps"
          variant="round"
          className="text-xs text-amber-600 dark:text-amber-300"
        />
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          Palmos App
        </span>
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 dark:bg-amber-500/15">
          <Icon
            name="apps"
            className="text-lg text-amber-600/70 dark:text-amber-400/70"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800 dark:text-white/85">
            {ext?.config.displayName ?? appId}
          </p>
          {ext?.config.description && (
            <p className="truncate text-[10px] text-gray-500 dark:text-white/45">
              {ext.config.description}
            </p>
          )}
        </div>
        <button
          onClick={openInEditor}
          className="flex items-center gap-1 rounded-lg border border-amber-300/60 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-500/35 dark:text-amber-300 dark:hover:bg-amber-500/10"
        >
          <Icon name="open_in_new" variant="round" className="text-xs" />
          Open
        </button>
      </div>
    </div>
  );
}
