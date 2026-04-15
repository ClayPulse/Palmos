"use client";

import Icon from "@/components/misc/icon";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { ProjectMemberInfo } from "@/lib/types";
import {
  addToast,
  Avatar,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { useCallback, useEffect, useState } from "react";

export default function ProjectMembers({
  projectId,
  isOwner,
}: {
  projectId: string;
  isOwner: boolean;
}) {
  const { inviteToProject, listMembers, removeMember } = useProjectManager();
  const [members, setMembers] = useState<ProjectMemberInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isSending, setIsSending] = useState(false);

  // Generic invite link state
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const m = await listMembers(projectId);
    setMembers(m);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleInvite() {
    if (!inviteEmail) return;
    setIsSending(true);
    await inviteToProject(projectId, inviteEmail, inviteRole);
    setInviteEmail("");
    setIsSending(false);
  }

  async function handleGenerateLink() {
    setIsGeneratingLink(true);
    try {
      const res = await fetchAPI("/api/project/invite/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, role: inviteRole }),
      });
      if (!res.ok) {
        const msg = await res.text();
        addToast({
          title: "Failed to create invite link",
          description: msg,
          color: "danger",
        });
        return;
      }
      const data = await res.json();
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://palmos.ai";
      const link = `${baseUrl}/invite/${data.token}`;
      setInviteLink(link);
      navigator.clipboard.writeText(link);
      addToast({ title: "Invite link copied to clipboard", color: "success" });
    } catch {
      addToast({ title: "Failed to create invite link", color: "danger" });
    } finally {
      setIsGeneratingLink(false);
    }
  }

  function handleCopyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    addToast({ title: "Link copied", color: "success" });
  }

  async function handleRevokeLink() {
    try {
      await fetchAPI("/api/project/invite/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      setInviteLink(null);
      addToast({ title: "Invite link revoked", color: "success" });
    } catch {
      addToast({ title: "Failed to revoke link", color: "danger" });
    }
  }

  async function handleRemove(memberId: string) {
    const ok = await removeMember(projectId, memberId);
    if (ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  }

  const roleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "primary";
      case "editor":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {isOwner && (
        <>
          {/* Invite by email */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Invite by Email</p>
            <div className="flex gap-2">
              <Input
                size="sm"
                placeholder="Email address"
                type="email"
                value={inviteEmail}
                onValueChange={setInviteEmail}
                className="flex-1"
              />
              <Select
                size="sm"
                selectedKeys={[inviteRole]}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-28"
                aria-label="Role"
              >
                <SelectItem key="member">Member</SelectItem>
                <SelectItem key="editor">Editor</SelectItem>
                <SelectItem key="viewer">Viewer</SelectItem>
              </Select>
              <Button
                size="sm"
                color="primary"
                isLoading={isSending}
                onPress={handleInvite}
              >
                Invite
              </Button>
            </div>
          </div>

          {/* Invite link */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Invite Link</p>
            <p className="text-default-400 text-xs dark:text-white/40">
              Anyone with this link can join the project. Expires in 7 days.
            </p>
            {inviteLink ? (
              <div className="border-default-200 bg-default-50 flex items-center gap-2 rounded-lg border px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <Icon
                  name="link"
                  variant="round"
                  className="text-default-400 shrink-0 text-sm"
                />
                <span className="text-default-600 min-w-0 flex-1 truncate text-xs dark:text-white/60">
                  {inviteLink}
                </span>
                <Tooltip content="Copy link" size="sm">
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={handleCopyLink}
                  >
                    <Icon
                      name="content_copy"
                      variant="round"
                      className="text-sm"
                    />
                  </Button>
                </Tooltip>
                <Tooltip content="Revoke link" size="sm">
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onPress={handleRevokeLink}
                  >
                    <Icon name="link_off" variant="round" className="text-sm" />
                  </Button>
                </Tooltip>
              </div>
            ) : (
              <Button
                size="sm"
                variant="flat"
                isLoading={isGeneratingLink}
                onPress={handleGenerateLink}
                startContent={
                  <Icon name="add_link" variant="round" className="text-sm" />
                }
              >
                Generate Invite Link
              </Button>
            )}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          Members {!isLoading && `(${members.length})`}
        </p>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="hover:bg-default-100 flex items-center justify-between rounded-lg px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <Avatar
                  size="sm"
                  name={member.name ?? member.email}
                  src={member.image ?? undefined}
                />
                <div className="flex flex-col">
                  <span className="text-sm">{member.name ?? member.email}</span>
                  {member.name && (
                    <span className="text-default-400 text-xs">
                      {member.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Chip size="sm" color={roleColor(member.role)} variant="flat">
                  {member.role}
                </Chip>
                {isOwner && member.role !== "owner" && (
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => handleRemove(member.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
