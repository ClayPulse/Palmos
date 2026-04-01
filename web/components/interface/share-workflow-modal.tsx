"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { Workflow } from "@/lib/types";
import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useState } from "react";

export default function ShareWorkflowModal({
  workflow,
  isOpen,
  onClose,
}: {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!workflow.id) {
      addToast({
        title: "Error",
        description: "Workflow ID is not available.",
        color: "danger",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowIds: [workflow.id],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create share link");
      }

      const data = await res.json();
      setShareUrl(data.url);
    } catch (err) {
      addToast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create share link",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      addToast({
        title: "Copied",
        description: "Share link copied to clipboard.",
        color: "success",
      });
    }
  }

  function handleClose() {
    setShareUrl(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        <ModalHeader>Share Workflow with Client</ModalHeader>
        <ModalBody>
          <p className="text-sm opacity-60">
            Create a link that lets your client accept{" "}
            <strong>{workflow.name}</strong> and optionally connect to a
            messaging channel.
          </p>

          <Divider />

          {shareUrl ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Share this link:</p>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  isReadOnly
                  size="sm"
                  classNames={{ input: "text-xs" }}
                />
                <Button size="sm" color="primary" onPress={handleCopy}>
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          {shareUrl ? (
            <Button onPress={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="light" onPress={handleClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                isLoading={loading}
                onPress={handleCreate}
              >
                Create Link
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
