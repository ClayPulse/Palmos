"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Tab, Tabs } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import type { Team } from "@/components/views/home/fallback-inbox";

type Permission = "read" | "edit";

type Member = {
  userId: string;
  email: string | null;
  name: string | null;
  role: "owner" | "viewer" | "editor";
  addedAt: string;
};

const EXPIRY_OPTIONS = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "0", label: "Never" },
];

export function ShareTeamModal({
  team,
  isOpen,
  onClose,
}: {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"link" | "email" | "members">("link");
  const [permission, setPermission] = useState<Permission>("read");
  const [expiryDays, setExpiryDays] = useState<string>("7");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState("");
  const [emailPermission, setEmailPermission] = useState<Permission>("read");
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!team) return;
    setMembersLoading(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data?.humans) ? data.humans : []);
      }
    } finally {
      setMembersLoading(false);
    }
  }, [team]);

  useEffect(() => {
    if (isOpen) {
      setGeneratedUrl(null);
      setEmail("");
      void loadMembers();
    }
  }, [isOpen, loadMembers]);

  if (!team) return null;

  const generateLink = async () => {
    setGenerating(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission,
          expiresInDays: expiryDays === "0" ? null : Number(expiryDays),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Failed: ${res.status}`);
      }
      const data = await res.json();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/teams/join?token=${encodeURIComponent(data.token)}`;
      setGeneratedUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        addToast({ title: "Link copied", color: "success" });
      } catch {
        addToast({ title: "Link generated", color: "success" });
      }
    } catch (err) {
      addToast({
        title: "Couldn't generate link",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), permission: emailPermission }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Failed: ${res.status}`);
      }
      addToast({ title: `Invite sent to ${email}`, color: "success" });
      setEmail("");
    } catch (err) {
      addToast({
        title: "Couldn't send invite",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setSending(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Failed: ${res.status}`);
      }
      addToast({ title: "Member removed", color: "success" });
      void loadMembers();
    } catch (err) {
      addToast({
        title: "Couldn't remove member",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Icon name="person_add" variant="round" />
          Share "{team.name}"
        </ModalHeader>
        <ModalBody className="gap-4">
          <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as any)} variant="underlined">
            <Tab key="link" title="Share link">
              <div className="flex flex-col gap-3 pt-2">
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-default-500">Permission</div>
                  <div className="flex gap-2">
                    {(["read", "edit"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPermission(p)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${permission === p ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10" : "border-default-200 dark:border-white/10"}`}
                      >
                        <div className="font-semibold capitalize text-default-800 dark:text-white/90">
                          {p === "read" ? "Read-only" : "Can edit"}
                        </div>
                        <div className="text-xs text-default-500 dark:text-white/45">
                          {p === "read" ? "View threads, deliveries, and roster." : "Above + manage roster & settings."}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Select
                  label="Expires"
                  selectedKeys={[expiryDays]}
                  onSelectionChange={(k) => setExpiryDays(Array.from(k)[0] as string)}
                  variant="bordered"
                >
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.key}>{o.label}</SelectItem>
                  ))}
                </Select>
                {generatedUrl && (
                  <div className="rounded-lg border border-default-200 bg-default-50 p-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-default-400">Link</div>
                    <div className="mt-1 break-all font-mono text-xs text-default-700 dark:text-white/75">{generatedUrl}</div>
                  </div>
                )}
                <Button color="primary" onPress={generateLink} isLoading={generating} startContent={<Icon name="link" variant="round" className="text-sm" />}>
                  {generatedUrl ? "Generate new link" : "Generate & copy link"}
                </Button>
              </div>
            </Tab>
            <Tab key="email" title="Email invite">
              <div className="flex flex-col gap-3 pt-2">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onValueChange={setEmail}
                  placeholder="teammate@company.com"
                  variant="bordered"
                />
                <div>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-default-500">Permission</div>
                  <div className="flex gap-2">
                    {(["read", "edit"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEmailPermission(p)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${emailPermission === p ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" : "border-default-200 text-default-600 dark:border-white/10 dark:text-white/65"}`}
                      >
                        {p === "read" ? "Read-only" : "Can edit"}
                      </button>
                    ))}
                  </div>
                </div>
                <Button color="primary" onPress={sendEmail} isLoading={sending} isDisabled={!email.trim()} startContent={<Icon name="send" variant="round" className="text-sm" />}>
                  Send invite
                </Button>
              </div>
            </Tab>
            <Tab key="members" title={`Members (${members.length})`}>
              <div className="flex flex-col gap-2 pt-2">
                {membersLoading && (
                  <div className="py-6 text-center text-xs text-default-400">Loading…</div>
                )}
                {!membersLoading && members.length === 0 && (
                  <div className="py-6 text-center text-xs text-default-400">No human members yet — share the link or send an email invite.</div>
                )}
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between rounded-lg border border-default-200 px-3 py-2 dark:border-white/10">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-default-800 dark:text-white/90">{m.name ?? m.email ?? m.userId}</div>
                      <div className="truncate text-xs text-default-500 dark:text-white/45">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-default-100 px-2 py-0.5 text-[11px] font-medium capitalize text-default-600 dark:bg-white/8 dark:text-white/60">{m.role}</span>
                      {m.role !== "owner" && (
                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => removeMember(m.userId)}>
                          <Icon name="close" variant="round" className="text-sm" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
