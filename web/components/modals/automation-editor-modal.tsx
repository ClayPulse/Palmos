"use client";

import AutomationRunHistory from "@/components/explorer/automation/automation-run-history";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAutomations } from "@/lib/hooks/use-automations";
import { useTranslations } from "@/lib/hooks/use-translations";
import { Automation } from "@/lib/types";
import DialTimePicker from "@/components/misc/dial-time-picker";
import {
  Button,
  Checkbox,
  Chip,
  DatePicker,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs,
  Tooltip,
} from "@heroui/react";
import type { CalendarDate } from "@internationalized/date";
import { getLocalTimeZone, today } from "@internationalized/date";
import { useContext, useEffect, useRef, useState } from "react";
import ModalWrapper from "./wrapper";

const CRON_PRESETS = [
  { labelKey: "automationEditorModal.every15min", value: "*/15 * * * *" },
  { labelKey: "automationEditorModal.hourly", value: "0 * * * *" },
  { labelKey: "automationEditorModal.daily9am", value: "0 9 * * *" },
  { labelKey: "automationEditorModal.weeklyMon", value: "0 9 * * 1" },
];

export default function AutomationEditorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);
  const editingAutomation =
    editorContext?.editorStates.modalStates?.automationEditor?.automation;

  const {
    createAutomation,
    updateAutomation,
    deleteAutomation,
    triggerAutomation,
  } = useAutomations();
  const { workflows } = useMarketplaceWorkflows("Published by Me");

  const [name, setName] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [workflowVersion, setWorkflowVersion] = useState("");
  const [triggerType, setTriggerType] = useState<"schedule" | "webhook">(
    "schedule",
  );
  const [cronExpression, setCronExpression] = useState("*/15 * * * *");
  const [recurring, setRecurring] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<CalendarDate | null>(null);
  const [schedHour, setSchedHour] = useState(9);
  const [schedMinute, setSchedMinute] = useState(0);
  const [schedPeriod, setSchedPeriod] = useState<"AM" | "PM">("AM");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [inputArgs, setInputArgs] = useState<
    { key: string; value: string; description?: string }[]
  >([]);
  const [showTimeDial, setShowTimeDial] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState<"AM" | "PM">("AM");
  const [notifyInbox, setNotifyInbox] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editingAutomation) {
      setName(editingAutomation.name);
      setWorkflowName(editingAutomation.workflowName);
      setWorkflowVersion(editingAutomation.workflowVersion);
      setTriggerType(editingAutomation.triggerType as "schedule" | "webhook");
      setCronExpression(editingAutomation.cronExpression ?? "*/15 * * * *");
      setRecurring(!!editingAutomation.cronExpression);
      setWebhookSecret(editingAutomation.webhookSecret ?? "");
      setNotifyInbox(editingAutomation.notifyInbox ?? true);
      setNotifyEmail(editingAutomation.notifyEmail ?? true);
      const args = editingAutomation.inputArgs ?? {};
      setInputArgs(
        Object.entries(args).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      );
    } else {
      resetForm();
    }
  }, [editingAutomation]);

  function resetForm() {
    setName("");
    setWorkflowName("");
    setWorkflowVersion("");
    setTriggerType("schedule");
    setCronExpression("*/15 * * * *");
    setScheduledDate(null);
    setSchedHour(9);
    setSchedMinute(0);
    setSchedPeriod("AM");
    setRecurring(true);
    setWebhookSecret("");
    setInputArgs([]);
    setNotifyInbox(true);
    setNotifyEmail(true);
    setError(null);
  }

  function getInputArgsObject(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const arg of inputArgs) {
      if (arg.key.trim()) obj[arg.key.trim()] = arg.value;
    }
    return obj;
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      const args = getInputArgsObject();
      if (editingAutomation) {
        await updateAutomation(editingAutomation.id, {
          name,
          workflowName,
          workflowVersion,
          cronExpression:
            triggerType === "schedule" ? cronExpression : undefined,
          recurring: triggerType === "schedule" ? recurring : undefined,
          webhookSecret: triggerType === "webhook" ? webhookSecret : undefined,
          inputArgs: Object.keys(args).length > 0 ? args : undefined,
          notifyInbox,
          notifyEmail,
        } as Partial<Automation>);
      } else {
        const schedDateObj = scheduledDate
          ? scheduledDate.toDate(getLocalTimeZone())
          : new Date();
        let h24 = schedHour % 12;
        if (schedPeriod === "PM") h24 += 12;
        schedDateObj.setHours(h24, schedMinute, 0, 0);
        const schedDate = schedDateObj.toISOString();
        await createAutomation({
          name,
          workflowName,
          workflowVersion,
          triggerType,
          cronExpression:
            triggerType === "schedule" ? cronExpression : undefined,
          scheduledAt: triggerType === "schedule" ? schedDate : undefined,
          recurring: triggerType === "schedule" ? recurring : undefined,
          webhookSecret: triggerType === "webhook" ? webhookSecret : undefined,
          inputArgs: Object.keys(args).length > 0 ? args : undefined,
          notifyInbox,
          notifyEmail,
        } as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message ?? t("automationEditorModal.failedToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingAutomation) return;
    setIsSaving(true);
    try {
      await deleteAutomation(editingAutomation.id);
      onClose();
    } catch (err: any) {
      setError(err.message ?? t("automationEditorModal.failedToDelete"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRunNow() {
    if (!editingAutomation) return;
    setIsSaving(true);
    try {
      await triggerAutomation(editingAutomation.id, "manual");
    } catch (err: any) {
      setError(err.message ?? t("automationEditorModal.failedToTrigger"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleWorkflowSelect(keys: any) {
    const selectedKey = Array.from(keys)[0] as string;
    if (!selectedKey) return;
    const wf = workflows?.find((w) => `${w.name}@${w.version}` === selectedKey);
    if (wf) {
      setWorkflowName(wf.name);
      setWorkflowVersion(wf.version);

      // Extract input parameters from the default entry node
      const entryNode = wf.content?.nodes?.find(
        (node: any) => node.data?.isDefaultEntry,
      );
      const params = entryNode?.data?.selectedAction?.parameters;
      if (params && typeof params === "object") {
        setInputArgs(
          Object.entries(params).map(([key, param]: [string, any]) => ({
            key,
            value: "",
            description: param?.description ?? "",
          })),
        );
      } else {
        setInputArgs([]);
      }
    }
  }

  function generateSecret() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    setWebhookSecret(
      Array.from(array)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
  }

  const isEdit = !!editingAutomation;
  const webhookUrl = editingAutomation?.webhookUrl;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t("automationEditorModal.editAutomation") : t("automationEditorModal.createAutomation")}
    >
      <div className="space-y-4 pb-4">
        {error && (
          <div className="bg-danger-50 dark:bg-danger-50/10 rounded-lg p-3">
            <p className="text-danger text-xs">{error}</p>
          </div>
        )}

        <Input
          label={t("automationEditorModal.name")}
          placeholder={t("automationEditorModal.namePlaceholder")}
          value={name}
          onValueChange={setName}
          size="sm"
        />

        <Select
          label={t("automationEditorModal.workflow")}
          placeholder={t("automationEditorModal.selectWorkflow")}
          size="sm"
          selectedKeys={workflowName ? [`${workflowName}@${workflowVersion}`] : []}
          onSelectionChange={handleWorkflowSelect}
          disallowEmptySelection
        >
          {(workflows ?? []).map((wf) => (
            <SelectItem key={`${wf.name}@${wf.version}`} textValue={`${wf.name} v${wf.version}`}>
              {wf.name} v{wf.version}
            </SelectItem>
          ))}
        </Select>

        {!isEdit && (
          <div>
            <p className="text-default-600 mb-2 text-xs font-medium">
              {t("automationEditorModal.triggerType")}
            </p>
            <Tabs
              size="sm"
              selectedKey={triggerType}
              onSelectionChange={(key) =>
                setTriggerType(key as "schedule" | "webhook")
              }
            >
              <Tab
                key="schedule"
                title={
                  <div className="flex items-center gap-1">
                    <Icon name="schedule" className="text-sm" />
                    {t("automationEditorModal.schedule")}
                  </div>
                }
              />
              <Tab
                key="webhook"
                title={
                  <div className="flex items-center gap-1">
                    <Icon name="link" className="text-sm" />
                    {t("automationEditorModal.webhook")}
                  </div>
                }
              />
            </Tabs>
          </div>
        )}

        {triggerType === "schedule" && (
          <div className="space-y-3">
            <div>
              <p className="text-default-600 mb-2 text-xs font-medium">
                {t("automationEditorModal.presets")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CRON_PRESETS.map((preset) => (
                  <Chip
                    key={preset.value}
                    size="sm"
                    variant={cronExpression === preset.value ? "solid" : "flat"}
                    color={
                      cronExpression === preset.value ? "primary" : "default"
                    }
                    className="cursor-pointer"
                    onClick={() => {
                      setCronExpression(preset.value);
                      setRecurring(true);
                    }}
                  >
                    {t(preset.labelKey)}
                  </Chip>
                ))}
              </div>
            </div>

            {!isEdit && (
              <div className="flex gap-2">
                <DatePicker
                  label={t("automationEditorModal.startDate")}
                  size="sm"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  minValue={today(getLocalTimeZone())}
                  className="flex-1"
                />
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTempHour(schedHour);
                      setTempMinute(schedMinute);
                      setTempPeriod(schedPeriod);
                      setShowTimeDial(true);
                    }}
                    className="bg-content2 border-default-200 hover:bg-content3 flex h-full w-full flex-col justify-center rounded-xl border px-3 py-1.5 text-left transition-colors dark:border-white/10"
                  >
                    <span className="text-default-600 text-[10px] font-medium">
                      {t("automationEditorModal.startTime")}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {String(schedHour).padStart(2, "0")}:
                      {String(schedMinute).padStart(2, "0")} {schedPeriod}
                    </span>
                  </button>
                  {showTimeDial && (
                    <TimeDialPopup
                      hour={tempHour}
                      minute={tempMinute}
                      period={tempPeriod}
                      onChange={(h, m, p) => {
                        setTempHour(h);
                        setTempMinute(m);
                        setTempPeriod(p);
                      }}
                      onSave={() => {
                        setSchedHour(tempHour);
                        setSchedMinute(tempMinute);
                        setSchedPeriod(tempPeriod);
                        setShowTimeDial(false);
                      }}
                      onClose={() => setShowTimeDial(false)}
                    />
                  )}
                </div>
              </div>
            )}

            <p className="text-default-400 text-xs">
              {t("automationEditorModal.minGranularity")}
            </p>
          </div>
        )}

        {triggerType === "webhook" && (
          <div className="space-y-3">
            {webhookUrl && (
              <div>
                <p className="text-default-600 mb-1 text-xs font-medium">
                  {t("automationEditorModal.webhookUrl")}
                </p>
                <div className="bg-content2 flex items-center gap-2 rounded-lg p-2">
                  <code className="min-w-0 flex-1 truncate text-xs">
                    {webhookUrl}
                  </code>
                  <Tooltip content={t("automationEditorModal.copyUrl")}>
                    <Button
                      size="sm"
                      isIconOnly
                      variant="flat"
                      onPress={() => navigator.clipboard.writeText(webhookUrl)}
                    >
                      <Icon name="content_copy" className="text-sm" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Input
                label={t("automationEditorModal.webhookSecret")}
                placeholder={t("automationEditorModal.webhookSecretPlaceholder")}
                value={webhookSecret}
                onValueChange={setWebhookSecret}
                size="sm"
                className="flex-1"
              />
              <Tooltip content={t("automationEditorModal.generateSecret")}>
                <Button
                  size="sm"
                  isIconOnly
                  variant="flat"
                  onPress={generateSecret}
                >
                  <Icon name="refresh" className="text-sm" />
                </Button>
              </Tooltip>
            </div>

            {webhookUrl && (
              <div>
                <p className="text-default-600 mb-1 text-xs font-medium">
                  {t("automationEditorModal.example")}
                </p>
                <pre className="bg-content2 overflow-x-auto rounded-lg p-2 text-xs">
                  {`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\${
    webhookSecret ? `\n  -H "X-Webhook-Signature: sha256=<hmac>" \\` : ""
  }
  -d '{"key":"value"}'`}
                </pre>
              </div>
            )}
          </div>
        )}

        {inputArgs.length > 0 && (
          <div>
            <p className="text-default-600 mb-2 text-xs font-medium">
              {t("automationEditorModal.workflowInputs")}
            </p>
            <div className="space-y-2">
              {inputArgs.map((arg, i) => (
                <Input
                  key={arg.key}
                  size="sm"
                  label={arg.key}
                  placeholder={arg.description || `Enter ${arg.key}`}
                  value={arg.value}
                  onValueChange={(v) => {
                    const next = [...inputArgs];
                    next[i] = { ...next[i], value: v };
                    setInputArgs(next);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notification preferences */}
        <div>
          <p className="text-default-600 mb-2 text-xs font-medium">
            Notify me when automation completes
          </p>
          <div className="flex flex-col gap-1.5">
            <Checkbox
              size="sm"
              isSelected={notifyInbox}
              onValueChange={setNotifyInbox}
              classNames={{ label: "text-xs text-default-600" }}
            >
              Inbox notifications
            </Checkbox>
            <Checkbox
              size="sm"
              isSelected={notifyEmail}
              onValueChange={setNotifyEmail}
              classNames={{ label: "text-xs text-default-600" }}
            >
              Email notifications
            </Checkbox>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {isEdit && (
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={handleDelete}
                isLoading={isSaving}
              >
                {t("common.delete")}
              </Button>
            )}
            {isEdit && (
              <Button
                size="sm"
                variant="flat"
                startContent={<Icon name="play_arrow" className="text-sm" />}
                onPress={handleRunNow}
                isLoading={isSaving}
              >
                {t("automationEditorModal.runNow")}
              </Button>
            )}
          </div>
          <Button
            size="sm"
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={!name || !workflowName}
          >
            {isEdit ? t("common.update") : t("common.create")}
          </Button>
        </div>

        {isEdit && editingAutomation && (
          <div className="pt-2">
            <AutomationRunHistory automationId={editingAutomation.id} />
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}

function TimeDialPopup({
  hour,
  minute,
  period,
  onChange,
  onSave,
  onClose,
}: {
  hour: number;
  minute: number;
  period: "AM" | "PM";
  onChange: (h: number, m: number, p: "AM" | "PM") => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { getTranslations: t } = useTranslations();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onSave();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onSave]);

  return (
    <div
      ref={popupRef}
      className="bg-content1 border-default-200 absolute right-0 z-50 mt-1 rounded-xl border p-4 shadow-xl dark:border-white/10"
    >
      <DialTimePicker
        hour={hour}
        minute={minute}
        period={period}
        onChange={onChange}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="flat" onPress={onClose}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" color="primary" onPress={onSave}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
