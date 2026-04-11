"use client";

import { useState } from "react";
import useSWR from "swr";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import Icon from "@/components/misc/icon";
import {
  Button,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from "@heroui/react";

export default function WorkflowSettingsModal({
  workflowName,
  isOpen,
  onClose,
}: {
  workflowName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-x-2">
          <Icon name="tune" className="text-primary" />
          Workflow Settings
        </ModalHeader>
        <ModalBody>
          <p className="text-default-500 text-xs">
            Settings defined here apply to all apps in{" "}
            <span className="font-semibold">{workflowName}</span>. Per-app
            user settings take priority over these workflow-level settings.
          </p>
          <Divider />
          <WorkflowSettingsEditor workflowName={workflowName} />
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function WorkflowSettingsEditor({ workflowName }: { workflowName: string }) {
  const { platformApi } = usePlatformApi();

  const { data: settings, mutate } = useSWR<Record<string, string>>(
    `/api/workflow/user-settings/get?name=${encodeURIComponent(workflowName)}`,
    async () => {
      return (await platformApi?.getWorkflowSettings(workflowName)) ?? {};
    },
  );

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(false);

  return (
    <div className="flex flex-col gap-y-2">
      {settings && Object.keys(settings).length > 0 && (
        <div className="space-y-1">
          {Object.entries(settings).map(([key, value]) => (
            <SettingRow
              key={key}
              workflowName={workflowName}
              settingKey={key}
              settingValue={value}
              onUpdated={() => mutate()}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-x-1">
        <Input
          label="Key"
          size="sm"
          value={newKey}
          onValueChange={setNewKey}
        />
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
            await platformApi?.setWorkflowSetting(
              workflowName,
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
  workflowName,
  settingKey,
  settingValue,
  onUpdated,
}: {
  workflowName: string;
  settingKey: string;
  settingValue: string;
  onUpdated: () => void;
}) {
  const { platformApi } = usePlatformApi();
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
            await platformApi?.deleteWorkflowSetting(workflowName, settingKey);
            onUpdated();
          }}
        >
          <Icon name="delete" />
        </Button>
      </Tooltip>
    </div>
  );
}
