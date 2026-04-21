"use client";

import { useTranslations } from "@/lib/hooks/use-translations";
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
  Tab,
  Tabs,
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
  const { getTranslations: t } = useTranslations();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<"read" | "edit">("read");

  async function handleCreate() {
    if (!sessionId) {
      addToast({
        title: t("shareChatModal.error"),
        description: t("shareChatModal.noActiveSession"),
        color: "danger",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetchAPI("/api/chat/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, permission }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t("shareChatModal.failedToCreate"));
      }

      const data = await res.json();
      // Build share URL pointing to the editor with the share token
      const token = data.token ?? data.url?.split("/").pop();
      setShareUrl(token ? `${window.location.origin}?sharedChat=${token}` : data.url);
    } catch (err) {
      addToast({
        title: t("shareChatModal.error"),
        description:
          err instanceof Error ? err.message : t("shareChatModal.failedToCreate"),
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
        title: t("shareChatModal.copied"),
        description: t("shareChatModal.linkCopied"),
        color: "success",
      });
    }
  }

  function handleClose() {
    setShareUrl(null);
    setPermission("read");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        <ModalHeader>{t("shareChatModal.title")}</ModalHeader>
        <ModalBody>
          <p className="text-sm opacity-60">
            {t("shareChatModal.description")}
          </p>

          <Divider />

          {shareUrl ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">{t("shareChatModal.shareThisLink")}</p>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  isReadOnly
                  size="sm"
                  classNames={{ input: "text-xs" }}
                />
                <Button size="sm" color="primary" onPress={handleCopy}>
                  {t("shareChatModal.copy")}
                </Button>
              </div>
              <p className="text-xs opacity-50">
                {permission === "edit"
                  ? "Anyone with this link can view and continue this conversation."
                  : "Anyone with this link can view this conversation (read-only)."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Permission</p>
              <Tabs
                selectedKey={permission}
                onSelectionChange={(key) => setPermission(key as "read" | "edit")}
                size="sm"
                variant="bordered"
                fullWidth
              >
                <Tab key="read" title="Read-only" />
                <Tab key="edit" title="Can edit" />
              </Tabs>
              <p className="text-xs opacity-50">
                {permission === "edit"
                  ? "Recipients can view the chat history and continue the conversation."
                  : "Recipients can only view the chat history."}
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {shareUrl ? (
            <Button onPress={handleClose}>{t("shareChatModal.done")}</Button>
          ) : (
            <>
              <Button variant="light" onPress={handleClose}>
                {t("shareChatModal.cancel")}
              </Button>
              <Button
                color="primary"
                isLoading={loading}
                onPress={handleCreate}
              >
                {t("shareChatModal.createLink")}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
