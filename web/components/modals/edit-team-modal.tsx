"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from "@heroui/react";
import { useEffect, useState } from "react";
import type { Team } from "@/components/views/home/fallback-inbox";

const ICON_CHOICES = ["groups", "rocket_launch", "bolt", "campaign", "support_agent", "code", "design_services", "insights", "shopping_bag", "school"];

export function EditTeamModal({
  team,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  onOpenShare,
}: {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
  onOpenShare?: () => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [icon, setIcon] = useState("groups");
  const [hue, setHue] = useState(220);
  const [leadAgent, setLeadAgent] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!team) return;
    setName(team.name);
    setGoal(team.goal ?? "");
    setIcon(team.icon ?? "groups");
    setHue(team.hue ?? 220);
    setLeadAgent(team.lead ?? "");
    setConfirmingDelete(false);
  }, [team]);

  if (!team) return null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, icon, hue, leadAgent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Save failed: ${res.status}`);
      }
      addToast({ title: "Team updated", color: "success" });
      onSaved?.();
      onClose();
    } catch (err) {
      addToast({
        title: "Couldn't update team",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const res = await fetchAPI(`/api/agent/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Delete failed: ${res.status}`);
      }
      addToast({ title: `Deleted "${team.name}"`, color: "success" });
      onDeleted?.();
      onClose();
    } catch (err) {
      addToast({
        title: "Couldn't delete team",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
      <ModalContent>
        <ModalHeader>Manage team</ModalHeader>
        <ModalBody className="gap-4">
          <Input label="Name" value={name} onValueChange={setName} variant="bordered" />
          <Textarea
            label="Goal"
            value={goal}
            onValueChange={setGoal}
            variant="bordered"
            minRows={2}
          />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-default-500">Icon</div>
            <div className="flex flex-wrap gap-2">
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${icon === ic ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" : "border-default-200 text-default-500 hover:border-amber-200 dark:border-white/10 dark:text-white/50"}`}
                >
                  <Icon name={ic} variant="round" className="text-lg" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-default-500">
              <span>Hue</span>
              <span className="font-mono text-[11px]">{hue}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: `hsl(${hue} 70% 50%)` }}
            />
          </div>
          {team.agents.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-default-500">Lead agent</div>
              <div className="flex flex-wrap gap-2">
                {team.agents.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLeadAgent(id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${leadAgent === id ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300" : "border-default-200 bg-white text-default-500 hover:border-amber-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50"}`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
          {onOpenShare && (
            <div className="rounded-xl border border-default-200 bg-default-50 p-3 dark:border-white/8 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-default-800 dark:text-white/90">Members</div>
                  <div className="text-xs text-default-500 dark:text-white/45">Invite humans to view or edit this team.</div>
                </div>
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<Icon name="person_add" variant="round" className="text-sm" />}
                  onPress={onOpenShare}
                >
                  Share
                </Button>
              </div>
            </div>
          )}
          {confirmingDelete && (
            <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300">
              Permanently delete <strong>{team.name}</strong>? This cannot be undone.
            </div>
          )}
        </ModalBody>
        <ModalFooter className="justify-between">
          {confirmingDelete ? (
            <div className="flex gap-2">
              <Button variant="light" onPress={() => setConfirmingDelete(false)} isDisabled={saving}>Cancel</Button>
              <Button color="danger" onPress={remove} isLoading={saving}>Delete team</Button>
            </div>
          ) : (
            <Button color="danger" variant="light" onPress={() => setConfirmingDelete(true)} startContent={<Icon name="delete" variant="round" className="text-sm" />}>
              Delete team
            </Button>
          )}
          {!confirmingDelete && (
            <div className="flex gap-2">
              <Button variant="light" onPress={onClose}>Cancel</Button>
              <Button color="primary" onPress={save} isLoading={saving}>Save changes</Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
