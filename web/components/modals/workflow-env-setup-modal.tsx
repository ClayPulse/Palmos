"use client";

import Icon from "@/components/misc/icon";
import { setWorkflowSetting } from "@/lib/workflow-settings";
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
} from "@heroui/react";
import { useState } from "react";

type ManagedKeyInfo = {
  provider: string;
  basePriceDescription: string;
  markupPercent: number;
};

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
  managedAvailable = {},
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the user saves (or skips) all env values. */
  onComplete: () => void;
  /** The workflow ID to save settings against. */
  workflowId?: string;
  /** { VAR_NAME: "human-readable description" } from the YAML `env` block. */
  envEntries: Record<string, string>;
  /** Which keys have a managed API option available. */
  managedAvailable?: Record<string, ManagedKeyInfo>;
}) {
  const keys = Object.keys(envEntries);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, ""])),
  );
  // "managed" or "own" per key
  const [keySource, setKeySource] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      keys.map((k) => [k, managedAvailable[k] ? "managed" : "own"]),
    ),
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
            keySource[key] === "managed" ? "" : (values[key] ?? ""),
            true, // treat all env vars as secrets
            keySource[key] === "managed",
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
          <div className="mt-2 flex flex-col gap-y-4">
            {keys.map((key) => {
              const managed = managedAvailable[key];
              return (
                <div key={key} className="flex flex-col gap-y-1.5">
                  <span className="text-sm font-medium">{key}</span>
                  {envEntries[key] && envEntries[key] !== key && (
                    <span className="text-xs text-default-400">
                      {envEntries[key]}
                    </span>
                  )}

                  {managed ? (
                    <RadioGroup
                      size="sm"
                      value={keySource[key]}
                      onValueChange={(v) =>
                        setKeySource((prev) => ({ ...prev, [key]: v }))
                      }
                    >
                      <Radio value="managed">
                        <div className="flex flex-col gap-y-0.5">
                          <div className="flex items-center gap-x-1.5">
                            <span className="text-sm">
                              Use Palmos Managed Key
                            </span>
                            <Chip size="sm" variant="flat" color="secondary">
                              {managed.provider}
                            </Chip>
                            <Chip size="sm" variant="flat" color="warning">
                              +{managed.markupPercent}% markup
                            </Chip>
                          </div>
                          <span className="text-xs text-default-400">
                            {managed.basePriceDescription} &mdash; You pay{" "}
                            {managed.markupPercent}% on top of{" "}
                            {managed.provider}&apos;s pricing. No API key
                            needed.
                          </span>
                        </div>
                      </Radio>
                      <Radio value="own">
                        <span className="text-sm">Use your own API key</span>
                      </Radio>
                    </RadioGroup>
                  ) : null}

                  {(!managed || keySource[key] === "own") && (
                    <Input
                      size="sm"
                      type="password"
                      placeholder={`Enter ${key}`}
                      value={values[key] ?? ""}
                      onValueChange={(v) =>
                        setValues((prev) => ({ ...prev, [key]: v }))
                      }
                    />
                  )}
                </div>
              );
            })}
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
