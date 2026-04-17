"use client";

import Icon from "@/components/misc/icon";
import type { TriggerType } from "@/lib/types";
import type { Automation } from "@/lib/types";
import { Button, Chip } from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useState } from "react";

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
