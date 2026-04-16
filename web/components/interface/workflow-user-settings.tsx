"use client";

import Icon from "@/components/misc/icon";
import {
  deleteWorkflowSetting,
  setWorkflowSetting,
  workflowSettingsFetcher,
} from "@/lib/workflow-settings";
import { Button, Input, Tooltip } from "@heroui/react";
import { useState } from "react";
import useSWR from "swr";

export default function WorkflowUserSettings({
  workflowId,
}: {
  workflowId: string;
}) {
  const { data: settings, mutate } = useSWR<Record<string, string>>(
    `/api/workflow/user-settings/get?workflowId=${encodeURIComponent(workflowId)}`,
    workflowSettingsFetcher,
  );

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(false);

  return (
    <div className="flex flex-col gap-y-2">
      <p className="text-sm font-semibold">User Settings</p>
      <p className="text-default-500 text-xs">
        These settings apply to all apps in this workflow. Per-app settings take
        priority over workflow-level settings.
      </p>
      {settings && Object.keys(settings).length > 0 && (
        <div className="space-y-1">
          {Object.entries(settings).map(([key, value]) => (
            <SettingRow
              key={key}
              workflowId={workflowId}
              settingKey={key}
              settingValue={value}
              onUpdated={() => mutate()}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-x-1">
        <Input label="Key" size="sm" value={newKey} onValueChange={setNewKey} />
        <Input
          label="Value"
          size="sm"
          value={newValue}
          onValueChange={setNewValue}
          type={newIsSecret ? "password" : "text"}
        />
        <Button
          isIconOnly
          variant="light"
          onPress={() => setNewIsSecret((prev) => !prev)}
        >
          {newIsSecret ? <Icon name="lock" /> : <Icon name="lock_open" />}
        </Button>
        <Button
          isIconOnly
          variant="light"
          isDisabled={newKey.trim() === ""}
          onPress={async () => {
            await setWorkflowSetting(
              workflowId,
              newKey.trim(),
              newValue,
              newIsSecret,
            );
            mutate();
            setNewKey("");
            setNewValue("");
            setNewIsSecret(false);
          }}
        >
          <Icon name="add" />
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  workflowId,
  settingKey,
  settingValue,
  onUpdated,
}: {
  workflowId: string;
  settingKey: string;
  settingValue: string;
  onUpdated: () => void;
}) {
  const isRedacted = settingValue === "redacted";

  return (
    <div className="flex items-center gap-x-1">
      <Input
        label={settingKey}
        size="sm"
        value={settingValue}
        isReadOnly
        type={isRedacted ? "password" : "text"}
      />
      <Tooltip content="Delete setting">
        <Button
          isIconOnly
          variant="light"
          color="danger"
          size="sm"
          onPress={async () => {
            await deleteWorkflowSetting(workflowId, settingKey);
            onUpdated();
          }}
        >
          <Icon name="delete" />
        </Button>
      </Tooltip>
    </div>
  );
}
