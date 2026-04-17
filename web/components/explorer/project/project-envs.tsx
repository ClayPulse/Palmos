"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import {
  addToast,
  Button,
  Checkbox,
  Input,
  Spinner,
} from "@heroui/react";
import { useCallback, useEffect, useState } from "react";

interface ProjectEnvItem {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export default function ProjectEnvs({
  projectId,
  isOwner,
}: {
  projectId: string;
  isOwner: boolean;
}) {
  const [envs, setEnvs] = useState<ProjectEnvItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAPI(`/api/project/env/list?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setEnvs(data.envs);
      }
    } catch {
      addToast({ title: "Failed to load project envs", color: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd() {
    if (!newKey.trim() || !newValue.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetchAPI("/api/project/env/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: newKey.trim(),
          value: newValue.trim(),
          isSecret: newIsSecret,
        }),
      });
      if (res.ok) {
        setNewKey("");
        setNewValue("");
        setNewIsSecret(true);
        await refresh();
      } else {
        const msg = await res.text();
        addToast({ title: "Failed to save env", description: msg, color: "danger" });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(env: ProjectEnvItem) {
    if (!editValue.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetchAPI("/api/project/env/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          key: env.key,
          value: editValue.trim(),
          isSecret: env.isSecret,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditValue("");
        await refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(key: string) {
    try {
      const res = await fetchAPI("/api/project/env/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, key }),
      });
      if (res.ok) {
        await refresh();
      }
    } catch {
      addToast({ title: "Failed to delete env", color: "danger" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-default-400 text-xs dark:text-white/40">
        Project environment variables are shared with all project members. When
        a member runs any workflow in this project, these values are
        automatically available.
      </p>

      {isOwner && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Add Environment Variable</p>
          <div className="flex gap-2">
            <Input
              size="sm"
              placeholder="KEY"
              value={newKey}
              onValueChange={setNewKey}
              className="flex-1"
            />
            <Input
              size="sm"
              placeholder="Value"
              type={newIsSecret ? "password" : "text"}
              value={newValue}
              onValueChange={setNewValue}
              className="flex-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <Checkbox
              size="sm"
              isSelected={newIsSecret}
              onValueChange={setNewIsSecret}
            >
              <span className="text-xs">Secret</span>
            </Checkbox>
            <Button
              size="sm"
              color="primary"
              isLoading={isSaving}
              onPress={handleAdd}
              isDisabled={!newKey.trim() || !newValue.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          Variables {envs.length > 0 && `(${envs.length})`}
        </p>
        {envs.length === 0 ? (
          <p className="text-default-400 py-2 text-center text-xs dark:text-white/40">
            No project environment variables configured.
          </p>
        ) : (
          envs.map((env) => (
            <div
              key={env.id}
              className="hover:bg-default-100 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Icon
                  name={env.isSecret ? "lock" : "lock_open"}
                  className="text-default-400 shrink-0 text-sm"
                />
                <span className="truncate text-sm font-mono">{env.key}</span>
                {editingId === env.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      size="sm"
                      type={env.isSecret ? "password" : "text"}
                      value={editValue}
                      onValueChange={setEditValue}
                      className="w-40"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      color="primary"
                      isLoading={isSaving}
                      onPress={() => handleUpdate(env)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span className="text-default-400 truncate text-xs">
                    {env.isSecret ? "••••••••" : env.value}
                  </span>
                )}
              </div>
              {isOwner && editingId !== env.id && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() => {
                      setEditingId(env.id);
                      setEditValue("");
                    }}
                  >
                    <Icon name="edit" className="text-sm" />
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    onPress={() => handleDelete(env.key)}
                  >
                    <Icon name="delete" className="text-sm" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
