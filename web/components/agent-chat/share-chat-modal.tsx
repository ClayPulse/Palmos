"use client";

import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import {
  addToast,
  Button,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useState } from "react";

export default function ShareChatModal({
  sessionId,
  isOpen,
  onClose,
}: {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!sessionId) {
      addToast({
        title: "Error",
        description: "No active chat session to share.",
        color: "danger",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI("/api/chat/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create share link");
      }

      const data = await res.json();
      // Build the share URL on the current app origin using a search param
      const token = data.token ?? data.url?.split("/").pop();
      setShareUrl(token ? `${window.location.origin}?sharedChat=${token}` : data.url);
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
        <ModalHeader>Share Chat</ModalHeader>
        <ModalBody>
          <p className="text-sm opacity-60">
            Create a link that lets anyone view this conversation (read-only).
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
