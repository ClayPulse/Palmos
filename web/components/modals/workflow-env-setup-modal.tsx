"use client";

import Icon from "@/components/misc/icon";
import { setWorkflowSetting } from "@/lib/workflow-settings";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useState } from "react";

/**
 * Shown when importing a workflow whose YAML declares an `env` block.
 * Lets the user fill in values for each required environment variable
 * before the workflow is actually loaded into the canvas.
 */
export default function WorkflowEnvSetupModal({
  isOpen,
  onClose,
  onComplete,
  workflowId,
  envEntries,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the user saves (or skips) all env values. */
  onComplete: () => void;
  /** The workflow ID to save settings against. */
  workflowId?: string;
  /** { VAR_NAME: "human-readable description" } from the YAML `env` block. */
  envEntries: Record<string, string>;
}) {
  const keys = Object.keys(envEntries);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, ""])),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!workflowId) {
      onComplete();
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        keys.map((key) =>
          setWorkflowSetting(
            workflowId,
            key,
            values[key] ?? "",
            true, // treat all env vars as secrets
          ),
        ),
      );
    } finally {
      setSaving(false);
    }
    onComplete();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
      isDismissable={false}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-x-2">
          <Icon name="key" className="text-warning" />
          Environment Variables
        </ModalHeader>
        <ModalBody>
          <p className="text-default-500 text-xs">
            This workflow requires the following environment variables. Fill
            them in now or skip and configure later via{" "}
            <span className="font-semibold">Workflow Settings</span>.
          </p>
          <div className="mt-2 flex flex-col gap-y-3">
            {keys.map((key) => (
              <div key={key} className="flex flex-col gap-y-1">
                <Input
                  label={key}
                  description={envEntries[key]}
                  size="sm"
                  type="password"
                  value={values[key] ?? ""}
                  onValueChange={(v) =>
                    setValues((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={() => {
              onComplete();
            }}
          >
            Skip
          </Button>
          <Button color="primary" isLoading={saving} onPress={handleSave}>
            Save & Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
