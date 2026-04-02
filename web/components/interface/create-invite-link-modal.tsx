"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Workflow } from "@/lib/types";
import {
  addToast,
  Button,
  Checkbox,
  CheckboxGroup,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useState } from "react";

export default function CreateInviteLinkModal({
  workflows,
  isOpen,
  onClose,
}: {
  workflows: Workflow[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (selectedIds.length === 0) {
      addToast({
        title: "No workflows selected",
        description: "Select at least one workflow to share.",
        color: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowIds: selectedIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create invite link");
      }

      const data = await res.json();
      setInviteUrl(data.url);
    } catch (err) {
      addToast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create invite link",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      addToast({
        title: "Copied",
        description: "Invite link copied to clipboard.",
        color: "success",
      });
    }
  }

  function handleClose() {
    setInviteUrl(null);
    setSelectedIds([]);
    onClose();
  }

  const selectableWorkflows = workflows.filter((w) => w.id);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Create Invite Link</ModalHeader>
        <ModalBody>
          {inviteUrl ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm opacity-60">
                Anyone with this link can accept the selected workflows and have
                them available in their AI manager.
              </p>
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  isReadOnly
                  size="sm"
                  classNames={{ input: "text-xs" }}
                />
                <Button size="sm" color="primary" onPress={handleCopy}>
                  Copy
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">Select workflows</p>
                {selectableWorkflows.length === 0 ? (
                  <p className="text-sm opacity-50">
                    No published workflows found. Publish a workflow first.
                  </p>
                ) : (
                  <CheckboxGroup
                    value={selectedIds}
                    onValueChange={setSelectedIds}
                  >
                    {selectableWorkflows.map((w) => (
                      <Checkbox key={w.id} value={w.id!}>
                        <span className="text-sm">
                          {w.name}{" "}
                          <span className="opacity-50">v{w.version}</span>
                        </span>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                )}
              </div>

            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {inviteUrl ? (
            <Button onPress={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="light" onPress={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                isLoading={loading}
                isDisabled={selectedIds.length === 0}
                onPress={handleCreate}
              >
                Create Link ({selectedIds.length} selected)
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
