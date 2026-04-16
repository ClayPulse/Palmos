"use client";

import { useTranslations } from "@/lib/hooks/use-translations";
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
  const { getTranslations: t } = useTranslations();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (selectedIds.length === 0) {
      addToast({
        title: t("createInviteLinkModal.noWorkflowsSelected"),
        description: t("createInviteLinkModal.selectAtLeastOne"),
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
        title: t("createInviteLinkModal.error"),
        description:
          err instanceof Error ? err.message : t("createInviteLinkModal.error"),
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
        title: t("createInviteLinkModal.copied"),
        description: t("createInviteLinkModal.copiedDescription"),
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
        <ModalHeader>{t("createInviteLinkModal.title")}</ModalHeader>
        <ModalBody>
          {inviteUrl ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm opacity-60">
                {t("createInviteLinkModal.linkDescription")}
              </p>
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  isReadOnly
                  size="sm"
                  classNames={{ input: "text-xs" }}
                />
                <Button size="sm" color="primary" onPress={handleCopy}>
                  {t("shareChatModal.copy")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-sm font-medium">{t("createInviteLinkModal.selectWorkflows")}</p>
                {selectableWorkflows.length === 0 ? (
                  <p className="text-sm opacity-50">
                    {t("createInviteLinkModal.noPublishedWorkflows")}
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
            <Button onPress={handleClose}>{t("createInviteLinkModal.done")}</Button>
          ) : (
            <>
              <Button variant="light" onPress={handleClose}>
                {t("common.cancel")}
              </Button>
              <Button
                color="primary"
                isLoading={loading}
                isDisabled={selectedIds.length === 0}
                onPress={handleCreate}
              >
                {t("createInviteLinkModal.createLink")} ({selectedIds.length} {t("createInviteLinkModal.selected")})
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
