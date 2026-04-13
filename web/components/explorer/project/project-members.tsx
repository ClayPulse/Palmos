"use client";

import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { ProjectMemberInfo } from "@/lib/types";
import {
  Avatar,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
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
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Invite Member</p>
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
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-default-100"
            >
              <div className="flex items-center gap-2">
                <Avatar
                  size="sm"
                  name={member.name ?? member.email}
                  src={member.image ?? undefined}
                />
                <div className="flex flex-col">
                  <span className="text-sm">
                    {member.name ?? member.email}
                  </span>
                  {member.name && (
                    <span className="text-xs text-default-400">
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
