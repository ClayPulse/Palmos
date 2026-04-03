"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useAutomations } from "@/lib/hooks/use-automations";
import { Automation, TriggerType } from "@/lib/types";
import { Button, Chip, Spinner, Switch, Tooltip } from "@heroui/react";
import { useContext } from "react";

const TRIGGER_CONFIG: Record<
  TriggerType,
  { icon: string; label: string; color: "warning" | "secondary" | "primary" | "success" }
> = {
  schedule: { icon: "schedule", label: "Scheduled", color: "warning" },
  webhook: { icon: "link", label: "Webhook", color: "secondary" },
  manual: { icon: "play_arrow", label: "Manual", color: "primary" },
  agentic: { icon: "bolt", label: "Agentic", color: "success" },
};

const STATUS_CONFIG: Record<string, { color: "default" | "primary" | "danger"; variant: "flat" | "dot" }> = {
  idle: { color: "default", variant: "flat" },
  running: { color: "primary", variant: "dot" },
  error: { color: "danger", variant: "flat" },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AutomationCard({
  automation,
  onToggle,
  onClick,
}: {
  automation: Automation;
  onToggle: (enabled: boolean) => void;
  onClick: () => void;
}) {
  const trigger = TRIGGER_CONFIG[automation.triggerType] ?? TRIGGER_CONFIG.manual;
  const statusCfg = STATUS_CONFIG[automation.status] ?? STATUS_CONFIG.idle;

  return (
    <button
      onClick={onClick}
      className="bg-content1 hover:bg-content3 border-default-200 w-full rounded-lg border p-3 text-left transition-colors dark:border-white/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{automation.name}</p>
            <Chip
              size="sm"
              color={statusCfg.color}
              variant={statusCfg.variant}
              classNames={{ content: "text-xs" }}
            >
              {automation.status}
            </Chip>
          </div>

          <p className="text-default-500 mt-0.5 truncate text-xs">
            {automation.workflowName} v{automation.workflowVersion}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip
              size="sm"
              color={trigger.color}
              variant="flat"
              startContent={
                <Icon name={trigger.icon} variant="round" className="text-xs" />
              }
              classNames={{ content: "text-xs" }}
            >
              {trigger.label}
            </Chip>

            {automation.lastRun && (
              <span className="text-default-400 text-xs">
                {automation.lastRun.creditsConsumed.toFixed(2)} credits
              </span>
            )}
          </div>

          {automation.lastRunAt && (
            <p className="text-default-400 mt-1.5 text-xs">
              Last run: {formatRelativeTime(automation.lastRunAt)}
            </p>
          )}

          {automation.consecutiveFailures >= 5 && (
            <p className="mt-1 text-xs text-danger">
              Auto-paused after {automation.consecutiveFailures} consecutive failures
            </p>
          )}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 pt-0.5"
        >
          <Tooltip content={automation.enabled ? "Disable" : "Enable"}>
            <div>
              <Switch
                size="sm"
                isSelected={automation.enabled}
                onValueChange={onToggle}
              />
            </div>
          </Tooltip>
        </div>
      </div>
    </button>
  );
}

export default function AutomationExplorer() {
  const editorContext = useContext(EditorContext);
  const { automations, isLoading, updateAutomation } = useAutomations({ refreshInterval: 30000 });

  const runningCount = automations.filter((a) => a.status === "running").length;

  function openEditor(automation?: Automation) {
    editorContext?.updateModalStates({
      automationEditor: {
        isOpen: true,
        automation,
      },
    });
  }

  return (
    <div className="grid h-full grid-rows-[max-content_auto] gap-y-2">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <p className="text-center text-lg font-semibold">Automations</p>
          {runningCount > 0 && (
            <Chip size="sm" color="primary" variant="flat">
              {runningCount} running
            </Chip>
          )}
        </div>
        <Button
          size="sm"
          color="primary"
          variant="flat"
          startContent={<Icon name="add" className="text-sm" />}
          onPress={() => openEditor()}
        >
          New
        </Button>
      </div>

      <div className="flex h-fit max-h-full w-full flex-col gap-2 overflow-x-hidden overflow-y-auto px-4 pb-4">
        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}

        {!isLoading && automations.length === 0 && (
          <div className="text-default-foreground/50 space-y-2 py-8 text-center text-sm">
            <Icon name="smart_toy" className="text-default-300 text-4xl" />
            <p>No automations yet.</p>
            <p className="text-xs">
              Create scheduled or webhook-triggered automations to run your
              workflows automatically.
            </p>
          </div>
        )}

        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onToggle={(enabled) =>
              updateAutomation(automation.id, { enabled })
            }
            onClick={() => openEditor(automation)}
          />
        ))}
      </div>
    </div>
  );
}
