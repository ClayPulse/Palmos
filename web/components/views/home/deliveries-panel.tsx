"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { addToast, Button } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

type DeliveryItem = {
  id: string;
  agentSlug: string;
  groupId: string | null;
  kind: string;
  title: string;
  summary: string | null;
  payload: any;
  status: "awaiting" | "changes-req" | "approved" | "sent" | "archived";
  confidence: number;
  createdAt: string;
};

type Group = {
  id: string;
  agentSlug: string;
  label: string;
  status: string;
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  awaiting:      { label: "Awaiting review",   cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",       icon: "schedule" },
  "changes-req": { label: "Changes requested", cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",           icon: "edit_note" },
  approved:      { label: "Approved",          cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: "check_circle" },
  sent:          { label: "Sent",              cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: "send" },
  archived:      { label: "Archived",          cls: "bg-default-100 text-default-500 dark:bg-white/8 dark:text-white/40",        icon: "archive" },
};

const KIND_ICONS: Record<string, string> = {
  email: "mail",
  image: "image",
  doc: "description",
  campaign: "campaign",
  research: "science",
  dashboard: "monitoring",
  code: "code",
  video: "movie",
  note: "sticky_note_2",
  text: "notes",
  slides: "slideshow",
  spreadsheet: "table_chart",
};

const FILTER_TABS = [
  { id: "all",         label: "All" },
  { id: "awaiting",    label: "Awaiting" },
  { id: "changes-req", label: "Changes" },
  { id: "approved",    label: "Approved" },
  { id: "sent",        label: "Sent" },
  { id: "archived",    label: "Archived" },
] as const;

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.archived;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.cls}`}>
      <Icon name={meta.icon} variant="round" className="text-[12px]" />
      {meta.label}
    </span>
  );
}

function Confidence({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "bg-emerald-500"
      : value >= 70
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-default-500 dark:text-white/45" title={`Agent confidence: ${value}%`}>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-default-200 dark:bg-white/10">
        <span className={`block h-full ${tone}`} style={{ width: `${value}%` }} />
      </span>
      {value}%
    </span>
  );
}

function ItemPreview({ item }: { item: DeliveryItem }) {
  const p = item.payload ?? {};
  if (item.kind === "email") {
    return (
      <div className="rounded-lg border border-default-200 bg-default-50 p-3 text-xs dark:border-white/10 dark:bg-white/[0.02]">
        {p.to && <div><span className="text-default-400">To: </span>{p.to}</div>}
        {p.subject && <div><span className="text-default-400">Subject: </span><strong>{p.subject}</strong></div>}
        {p.body && <div className="mt-2 whitespace-pre-wrap text-default-600 dark:text-white/65">{p.body}</div>}
      </div>
    );
  }
  if (item.kind === "code") {
    return (
      <div className="rounded-lg border border-default-200 bg-default-900 p-3 font-mono text-[11.5px] text-default-100 dark:border-white/10">
        {p.diff ?? p.summary ?? item.summary ?? "(no preview)"}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-3 text-xs text-default-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/65">
      {item.summary || JSON.stringify(p, null, 2).slice(0, 400)}
    </div>
  );
}

function ItemActions({
  item,
  onAction,
}: {
  item: DeliveryItem;
  onAction: (action: string, comment?: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" color="primary" startContent={<Icon name="check" variant="round" className="text-sm" />} onPress={() => onAction("approve")}>
          Approve
        </Button>
        {item.kind === "email" && (
          <Button size="sm" color="primary" variant="flat" startContent={<Icon name="send" variant="round" className="text-sm" />} onPress={() => onAction("send")}>
            Approve &amp; send
          </Button>
        )}
        <Button size="sm" variant="light" startContent={<Icon name="chat_bubble_outline" variant="round" className="text-sm" />} onPress={() => setShowComment((v) => !v)}>
          Request changes
        </Button>
        <Button size="sm" variant="light" color="danger" startContent={<Icon name="close" variant="round" className="text-sm" />} onPress={() => onAction("reject")}>
          Reject
        </Button>
      </div>
      {showComment && (
        <div className="rounded-lg border border-default-200 bg-default-50 p-2 dark:border-white/10 dark:bg-white/[0.02]">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What should the agent change?"
            rows={2}
            className="w-full resize-none bg-transparent text-xs outline-none placeholder:text-default-400 dark:text-white/85"
          />
          <div className="mt-1 flex justify-end">
            <Button
              size="sm"
              color="primary"
              isDisabled={!comment.trim()}
              onPress={() => { onAction("request-changes", comment); setComment(""); setShowComment(false); }}
            >
              Send feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeliveriesPanel({
  agentSlug,
  teamId,
  onBack,
}: {
  agentSlug?: string;
  teamId?: string;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (agentSlug) params.set("agentSlug", agentSlug);
      if (teamId) params.set("teamId", teamId);
      const res = await fetchAPI(`/api/agent/deliveries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setGroups(data.groups ?? []);
        setCounts(data.counts ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [filter, agentSlug, teamId]);

  useEffect(() => { void load(); }, [load]);

  const ungrouped = useMemo(() => items.filter((i) => !i.groupId), [items]);
  const itemsByGroup = useMemo(() => {
    const map = new Map<string, DeliveryItem[]>();
    for (const i of items) {
      if (!i.groupId) continue;
      const arr = map.get(i.groupId) ?? [];
      arr.push(i);
      map.set(i.groupId, arr);
    }
    return map;
  }, [items]);

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  const itemAction = async (id: string, action: string, comment?: string) => {
    try {
      const res = await fetchAPI(`/api/agent/deliveries/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      addToast({ title: `Action: ${action}`, color: "success" });
      void load();
    } catch (err) {
      addToast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    }
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    try {
      const res = await fetchAPI(`/api/agent/deliveries/bulk-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      addToast({ title: `${data.updated} updated`, color: "success" });
      setSelected(new Set());
      void load();
    } catch (err) {
      addToast({
        title: "Bulk action failed",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    }
  };

  const renderItem = (item: DeliveryItem) => {
    const isOpen = expandedItems.has(item.id);
    const isSelected = selected.has(item.id);
    return (
      <div key={item.id} className={`rounded-lg border ${isSelected ? "border-amber-300 dark:border-amber-500/40" : "border-default-200 dark:border-white/8"} bg-white dark:bg-white/[0.02]`}>
        <div className="flex items-start gap-2 p-2.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggle(selected, setSelected, item.id); }}
            className="mt-1"
          />
          <button
            type="button"
            onClick={() => toggle(expandedItems, setExpandedItems, item.id)}
            className="flex flex-1 items-start gap-2 text-left min-w-0"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-default-100 text-default-600 dark:bg-white/8 dark:text-white/65">
              <Icon name={KIND_ICONS[item.kind] ?? "inventory_2"} variant="round" className="text-sm" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[13px] font-semibold text-default-800 dark:text-white/90">{item.title}</div>
              {item.summary && <div className="line-clamp-1 text-[11.5px] text-default-500 dark:text-white/45">{item.summary}</div>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Confidence value={item.confidence} />
              <StatusPill status={item.status} />
            </div>
            <Icon name={isOpen ? "expand_less" : "expand_more"} variant="round" className="text-default-400" />
          </button>
        </div>
        {isOpen && (
          <div className="border-t border-default-200 px-3 py-3 dark:border-white/8">
            <ItemPreview item={item} />
            <div className="mt-3">
              <ItemActions item={item} onAction={(action, comment) => itemAction(item.id, action, comment)} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-default-200 p-3 dark:border-white/8">
        <Button isIconOnly size="sm" variant="light" onPress={onBack}>
          <Icon name="arrow_back" variant="round" className="text-sm" />
        </Button>
        <span className="text-[13px] font-semibold text-default-800 dark:text-white/90">Deliveries</span>
        <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          {counts.awaiting ?? 0} awaiting
        </span>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-default-200 px-3 py-2 dark:border-white/8 [&::-webkit-scrollbar]:hidden">
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${filter === t.id ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300" : "border-default-200 bg-white text-default-500 hover:border-amber-200 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50"}`}
          >
            {t.label}
            {counts[t.id] != null && counts[t.id] > 0 && (
              <span className="ml-1 text-[10px] font-semibold text-default-400">{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading && items.length === 0 ? (
          <div className="py-8 text-center text-[12.5px] text-default-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-[13px] text-default-400 dark:text-white/40">
            <Icon name="inbox" variant="round" className="text-3xl" />
            <span>No deliveries{filter === "all" ? " yet" : ` in "${filter}"`}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => {
              const groupItems = itemsByGroup.get(g.id) ?? [];
              if (groupItems.length === 0) return null;
              const expanded = expandedGroups.has(g.id);
              return (
                <div key={g.id} className="overflow-hidden rounded-xl border border-default-200 dark:border-white/8">
                  <button
                    type="button"
                    onClick={() => toggle(expandedGroups, setExpandedGroups, g.id)}
                    className="flex w-full items-center gap-2 bg-default-50 px-3 py-2 text-left dark:bg-white/[0.02]"
                  >
                    <Icon name={expanded ? "expand_less" : "expand_more"} variant="round" className="text-default-500" />
                    <span className="text-[13px] font-semibold text-default-800 dark:text-white/90">{g.label}</span>
                    <span className="text-[11px] text-default-400">{groupItems.length} items</span>
                    <StatusPill status={g.status} />
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-2 p-2">
                      {groupItems.map(renderItem)}
                    </div>
                  )}
                </div>
              );
            })}
            {ungrouped.length > 0 && (
              <div className="flex flex-col gap-2">
                {ungrouped.map(renderItem)}
              </div>
            )}
          </div>
        )}
      </div>
      {selected.size > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-t border-default-200 bg-white px-3 py-2 dark:border-white/8 dark:bg-white/[0.05]">
          <span className="text-[12px] font-semibold text-default-700 dark:text-white/80">
            {selected.size} selected
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" color="primary" startContent={<Icon name="check" variant="round" className="text-sm" />} onPress={() => bulkAction("approve")}>
              Approve all
            </Button>
            <Button size="sm" variant="light" color="danger" startContent={<Icon name="close" variant="round" className="text-sm" />} onPress={() => bulkAction("reject")}>
              Reject all
            </Button>
            <Button size="sm" variant="light" startContent={<Icon name="archive" variant="round" className="text-sm" />} onPress={() => bulkAction("archive")}>
              Archive
            </Button>
            <Button isIconOnly size="sm" variant="light" onPress={() => setSelected(new Set())}>
              <Icon name="close" variant="round" className="text-sm" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
