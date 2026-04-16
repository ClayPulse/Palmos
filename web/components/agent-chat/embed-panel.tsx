"use client";

import Icon from "@/components/misc/icon";
import A2UIView from "@/components/views/chat/a2ui-view";
import MCPAppsView from "@/components/views/chat/mcp-apps-view";
import PulseAppView from "@/components/views/chat/pulse-app-view";
import { useTranslations } from "@/lib/hooks/use-translations";
import { CanvasViewConfig } from "@/lib/types";
import { createCanvasViewId } from "@/lib/views/view-helpers";
import { useMemo } from "react";
import { MemoizedCanvasView } from "../views/editor/canvas/canvas-view";

import type {
  ChatEmbedPanelProps,
  EmbedPanelTab,
} from "@/components/agent-chat/types";

export type { EmbedPanelTab } from "@/components/agent-chat/types";

const TABS: { id: EmbedPanelTab; labelKey: string; icon: string }[] = [
  { id: "a2ui", labelKey: "embedPanel.a2ui", icon: "language" },
  { id: "mcp-apps", labelKey: "embedPanel.mcpApps", icon: "hub" },
  { id: "pulse-app", labelKey: "embedPanel.palmosApp", icon: "apps" },
  { id: "workflow-canvas", labelKey: "embedPanel.canvas", icon: "account_tree" },
];

export default function ChatEmbedPanel({
  activeTab,
  onTabChange,
  onClose,
}: ChatEmbedPanelProps) {
  const { getTranslations: t } = useTranslations();
  const canvasViewConfig = useMemo<CanvasViewConfig>(
    () => ({ viewId: createCanvasViewId(), appConfigs: [] }),
    [],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-amber-200/60 bg-white dark:border-white/8 dark:bg-[#0d0d14]">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-amber-200/60 bg-white px-2 py-2 dark:border-white/8 dark:bg-white/3">
        <div className="flex flex-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-white/50 dark:hover:bg-white/6 dark:hover:text-white/80"
              }`}
            >
              <Icon name={tab.icon} variant="round" className="text-sm" />
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-white/40 dark:hover:bg-white/6 dark:hover:text-white/70"
          aria-label="Close panel"
        >
          <Icon name="close" variant="round" className="text-base" />
        </button>
      </div>

      {/* Content area */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "a2ui" && <A2UIView />}

        {activeTab === "mcp-apps" && <MCPAppsView />}

        {activeTab === "pulse-app" && <PulseAppView />}

        {activeTab === "workflow-canvas" && (
          <MemoizedCanvasView
            config={canvasViewConfig}
            isActive={true}
            tabName="Workflow Canvas"
          />
        )}
      </div>
    </div>
  );
}
