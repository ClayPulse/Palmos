"use client";

import Icon from "@/components/misc/icon";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { playDeliveryChime } from "@/lib/utils/notification-sound";
import { addToast, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";

type DeliveryItem = {
  id: string;
  agentSlug: string;
  teamId: string | null;
  threadId: string | null;
  groupId: string | null;
  kind: string;
  title: string;
  summary: string | null;
  payload: any;
  status: "awaiting" | "changes-req" | "approved" | "sent" | "archived";
  confidence: number;
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

// Fire-and-forget worker stream call. Looks up the thread's sessionId via
// the inbox-threads endpoint, then POSTs to the worker stream so the user
// message persists and the agent runs to completion. The response stream is
// drained in the background — no UI is wired to it here.
async function fireWorkerStream(args: {
  agentSlug: string;
  inboxThreadId: string;
  userContent: string;
}) {
  try {
    const tRes = await fetchAPI(`/api/agent/inbox/threads/${args.inboxThreadId}`);
    if (!tRes.ok) return;
    const tData = await tRes.json();
    const sessionId: string | undefined = tData?.sessionId;
    if (!sessionId) return;

    const res = await fetchAPI(`/api/agent/worker/${encodeURIComponent(args.agentSlug)}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: args.userContent }],
        sessionId,
        inboxThreadId: args.inboxThreadId,
        persistToSession: true,
      }),
    });
    // Drain the SSE stream to completion so the server finishes persistence.
    const reader = res.body?.getReader();
    if (!reader) return;
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch (err) {
    console.warn("[deliveries] background worker stream failed:", err);
  }
}

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
  if (item.kind === "slides") {
    const slides: any[] = Array.isArray(p.slides)
      ? p.slides
      : Array.isArray(p.deck)
        ? p.deck
        : [];
    if (slides.length > 0) {
      return (
        <div className="flex flex-col gap-2">
          {slides.map((s, i) => {
            const title = s?.title ?? s?.heading ?? `Slide ${i + 1}`;
            const body = s?.body ?? s?.content ?? s?.text ?? "";
            const bullets: string[] = Array.isArray(s?.bullets)
              ? s.bullets
              : Array.isArray(s?.points)
                ? s.points
                : [];
            const notes = s?.notes ?? s?.speaker_notes;
            return (
              <div
                key={i}
                className="rounded-lg border border-default-200 bg-default-50 p-3 text-[13px] dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-default-400 dark:text-white/40">
                  <Icon name="slideshow" variant="round" className="text-xs" />
                  Slide {i + 1}
                </div>
                <div className="font-semibold text-default-800 dark:text-white/90">
                  {title}
                </div>
                {body && (
                  <div className="mt-1 whitespace-pre-wrap text-default-600 dark:text-white/65">
                    {body}
                  </div>
                )}
                {bullets.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-default-600 dark:text-white/65">
                    {bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
                {notes && (
                  <div className="mt-2 border-t border-default-200 pt-1.5 text-[11.5px] italic text-default-400 dark:border-white/10 dark:text-white/40">
                    Notes: {notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    // Fallback: agent only supplied an outline / body string.
    const outline =
      typeof p.outline === "string"
        ? p.outline
        : typeof p.body === "string"
          ? p.body
          : "";
    if (outline) {
      return (
        <div className="rounded-lg border border-default-200 bg-default-50 p-3 text-[13px] whitespace-pre-wrap text-default-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/65">
          {outline}
        </div>
      );
    }
  }
  if (item.kind === "doc" || item.kind === "note" || item.kind === "text") {
    const body = typeof p.body === "string" ? p.body : typeof p === "string" ? p : "";
    if (body) {
      return (
        <div className="rounded-lg border border-default-200 bg-default-50 p-3 text-[13px] whitespace-pre-wrap text-default-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/65">
          {body}
        </div>
      );
    }
  }
  if (item.kind === "image" && typeof p.url === "string") {
    return (
      <div className="overflow-hidden rounded-lg border border-default-200 dark:border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.url} alt={item.title} className="block max-h-[420px] w-full object-contain" />
        {p.brief && (
          <div className="border-t border-default-200 bg-default-50 p-2 text-[11.5px] text-default-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/55">
            {p.brief}
          </div>
        )}
      </div>
    );
  }
  // Generic fallback — show the full payload as JSON so the user can always
  // see what was actually delivered (no silent truncation).
  const hasPayload = p && Object.keys(p).length > 0;
  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-3 text-xs text-default-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/65">
      {hasPayload ? (
        <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed">
          {JSON.stringify(p, null, 2)}
        </pre>
      ) : (
        item.summary || "(no preview content was attached to this delivery)"
      )}
    </div>
  );
}

export function DeliveryDetailModal({
  item,
  isOpen,
  onClose,
}: {
  item: DeliveryItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setComment("");
      setShowComment(false);
      setBusy(false);
    }
  }, [isOpen]);

  if (!item) return null;

  const act = async (action: string, withComment?: string) => {
    setBusy(true);
    try {
      const res = await fetchAPI(`/api/agent/deliveries/${item.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: withComment }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      addToast({ title: `Action: ${action}`, color: "success" });

      // For change requests, push a user message into the delivery's chat
      // thread and let the agent respond. Tries an in-app handoff first
      // (live UI update if the user is sitting in that thread); falls back
      // to firing the worker stream directly so the message + agent reply
      // get persisted regardless.
      if (action === "request-changes" && item.threadId) {
        const marker = `[[delivery-change-request:${JSON.stringify({
          deliveryId: item.id,
          title: item.title,
          kind: item.kind,
          feedback: withComment ?? "",
        })}]]`;
        const content = `${marker}\nPlease revise the delivery "${item.title}". My feedback: ${withComment ?? "(no specifics provided)"}`;

        let handledLocally = false;
        try {
          const ev = new CustomEvent("palmos:request-changes", {
            detail: { threadId: item.threadId, content },
          });
          // Listeners can mark the event "handled" on its detail.
          window.dispatchEvent(ev);
          handledLocally = !!(ev as any).detail?.handled;
        } catch {}

        if (!handledLocally) {
          // Background fire-and-forget worker stream so the agent runs even
          // if the user isn't sitting in the relevant team chat.
          void fireWorkerStream({
            agentSlug: item.agentSlug,
            inboxThreadId: item.threadId,
            userContent: content,
          });
        }
      }

      try { window.dispatchEvent(new CustomEvent("palmos:delivery-submitted")); } catch {}
      onClose();
    } catch (err) {
      addToast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-default-100 text-default-600 dark:bg-white/8 dark:text-white/65">
            <Icon name={KIND_ICONS[item.kind] ?? "inventory_2"} variant="round" className="text-lg" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-default-400">
              {item.agentSlug} · {new Date(item.createdAt).toLocaleString()}
            </div>
            <div className="truncate text-base font-semibold text-default-900 dark:text-white">{item.title}</div>
          </div>
          <StatusPill status={item.status} />
        </ModalHeader>
        <ModalBody className="gap-4">
          {item.summary && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-[13px] leading-relaxed text-default-700 dark:border-amber-500/15 dark:bg-amber-500/5 dark:text-white/70">
              <Icon name="format_quote" variant="round" className="mt-0.5 text-base text-amber-500" />
              <span>{item.summary}</span>
            </div>
          )}
          <ItemPreview item={item} />
          <div className="flex items-center justify-between text-[11px] text-default-400">
            <Confidence value={item.confidence} />
            <span>Delivery ID: <span className="font-mono">{item.id.slice(0, 8)}</span></span>
          </div>
          {showComment && (
            <div className="rounded-xl border border-default-200 bg-default-50 p-2.5 dark:border-white/10 dark:bg-white/[0.02]">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What should the agent change?"
                rows={3}
                className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-default-400 dark:text-white/85"
                autoFocus
              />
              <div className="mt-1 flex justify-end gap-1.5">
                <Button size="sm" variant="light" onPress={() => { setShowComment(false); setComment(""); }} isDisabled={busy}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  isDisabled={!comment.trim() || busy}
                  onPress={() => act("request-changes", comment)}
                >
                  Send feedback
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="justify-between">
          <Button
            variant="light"
            color="danger"
            onPress={() => act("reject")}
            isDisabled={busy}
            startContent={<Icon name="close" variant="round" className="text-sm" />}
          >
            Reject
          </Button>
          <div className="flex gap-1.5">
            <Button
              variant="light"
              onPress={() => setShowComment((v) => !v)}
              isDisabled={busy}
              startContent={<Icon name="chat_bubble_outline" variant="round" className="text-sm" />}
            >
              Request changes
            </Button>
            <Button
              color="primary"
              onPress={() => act("approve")}
              isLoading={busy}
              startContent={<Icon name="check" variant="round" className="text-sm" />}
            >
              Approve
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function RecentDeliveriesSection({
  onOpenAll,
  agentSlug,
  teamId,
  limit = 4,
}: {
  onOpenAll: () => void;
  agentSlug?: string;
  teamId?: string;
  limit?: number;
}) {
  const [openItem, setOpenItem] = useState<DeliveryItem | null>(null);
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const totalRef = useRef<number | null>(null);
  const initialLoadRef = useRef(true);

  const load = useCallback(async () => {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentSlug) params.set("agentSlug", agentSlug);
      if (teamId) params.set("teamId", teamId);
      const qs = params.toString();
      const res = await fetchAPI(`/api/agent/deliveries${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        const nextCounts = data.counts ?? {};
        const nextTotal = nextCounts.all ?? (data.items?.length ?? 0);
        // Ring the chime when new deliveries arrive after the first load.
        if (
          !initialLoadRef.current &&
          totalRef.current != null &&
          nextTotal > totalRef.current
        ) {
          playDeliveryChime();
        }
        totalRef.current = nextTotal;
        initialLoadRef.current = false;
        setItems((data.items ?? []).slice(0, limit));
        setCounts(nextCounts);
      }
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [limit, hasLoadedOnce, agentSlug, teamId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onSubmitted = () => { void load(); };
    window.addEventListener("palmos:delivery-submitted", onSubmitted);
    // Fallback poll so we don't miss deliveries if the stream-chunk
    // detection misses a tool call shape we don't recognize.
    const interval = setInterval(() => { void load(); }, 8000);
    return () => {
      window.removeEventListener("palmos:delivery-submitted", onSubmitted);
      clearInterval(interval);
    };
  }, [load]);

  const awaiting = counts.awaiting ?? 0;
  const total = counts.all ?? items.length;

  return (
    <div className="border-b border-default-200 p-4 dark:border-white/8">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-default-400 dark:text-white/40">
          <Icon name="inventory_2" variant="round" className="text-sm" />
          Deliveries
          {awaiting > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {awaiting}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenAll}
          className="text-[11.5px] font-medium text-amber-700 hover:underline dark:text-amber-400"
        >
          View all{total > items.length ? ` (${total})` : ""}
        </button>
      </div>
      {loading && !hasLoadedOnce ? (
        <div className="py-3 text-center text-[11.5px] text-default-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-default-200 px-3 py-4 text-center text-[11.5px] text-default-400 dark:border-white/10">
          No deliveries yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenItem(item)}
              className="flex items-center gap-2 rounded-lg border border-default-200 bg-white px-2 py-1.5 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/30 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-amber-500/30"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-default-100 text-default-600 dark:bg-white/8 dark:text-white/65">
                <Icon name={KIND_ICONS[item.kind] ?? "inventory_2"} variant="round" className="text-[13px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-semibold text-default-800 dark:text-white/90">{item.title}</div>
                {item.summary && (
                  <div className="truncate text-[10.5px] text-default-500 dark:text-white/45">{item.summary}</div>
                )}
              </div>
              <StatusPill status={item.status} />
            </button>
          ))}
        </div>
      )}
      <DeliveryDetailModal
        item={openItem}
        isOpen={!!openItem}
        onClose={() => setOpenItem(null)}
      />
    </div>
  );
}

export function DeliveriesPanel({
  onBack,
  startId,
  agentSlug,
  teamId,
}: {
  onBack: () => void;
  startId?: string;
  agentSlug?: string;
  teamId?: string;
}) {
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [idx, setIdx] = useState(0);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const startIdConsumedRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentSlug) params.set("agentSlug", agentSlug);
      if (teamId) params.set("teamId", teamId);
      const qs = params.toString();
      const res = await fetchAPI(`/api/agent/deliveries${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        const all: DeliveryItem[] = data.items ?? [];
        // Awaiting items first; everything else after — so the queue prioritises
        // what needs review but you can still flip through history.
        const sorted = [...all].sort((a, b) => {
          if (a.status === "awaiting" && b.status !== "awaiting") return -1;
          if (b.status === "awaiting" && a.status !== "awaiting") return 1;
          return 0;
        });
        setItems(sorted);
        setCounts(data.counts ?? {});
        // Jump to the requested startId on first load.
        if (!startIdConsumedRef.current && startId) {
          const i = sorted.findIndex((x) => x.id === startId);
          if (i >= 0) setIdx(i);
          startIdConsumedRef.current = true;
        }
      }
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, startId, agentSlug, teamId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onSubmitted = () => { void load(); };
    window.addEventListener("palmos:delivery-submitted", onSubmitted);
    const interval = setInterval(() => { void load(); }, 8000);
    return () => {
      window.removeEventListener("palmos:delivery-submitted", onSubmitted);
      clearInterval(interval);
    };
  }, [load]);

  const total = items.length;
  const safeIdx = total === 0 ? 0 : Math.min(idx, total - 1);
  const current = total > 0 ? items[safeIdx] : null;
  const awaiting = counts.awaiting ?? 0;

  const goNext = () => {
    setShowComment(false);
    setComment("");
    setIdx((i) => Math.min(total - 1, i + 1));
  };
  const goPrev = () => {
    setShowComment(false);
    setComment("");
    setIdx((i) => Math.max(0, i - 1));
  };

  const act = async (action: string, withComment?: string) => {
    if (!current) return;
    try {
      const res = await fetchAPI(`/api/agent/deliveries/${current.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: withComment }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      addToast({ title: `Action: ${action}`, color: "success" });
      setShowComment(false);
      setComment("");
      // Optimistically move on to keep the queue flowing.
      const wasLast = safeIdx >= total - 1;
      void load();
      if (!wasLast) setIdx(safeIdx); // stay at same index — the next item shifts in
    } catch (err) {
      addToast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Unknown error",
        color: "danger",
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-default-200 p-3 dark:border-white/8">
        <Button isIconOnly size="sm" variant="light" onPress={onBack}>
          <Icon name="arrow_back" variant="round" className="text-sm" />
        </Button>
        <span className="text-[13px] font-semibold text-default-800 dark:text-white/90">Deliveries</span>
        {awaiting > 0 && (
          <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {awaiting} awaiting
          </span>
        )}
      </div>

      {loading && !hasLoadedOnce ? (
        <div className="flex flex-1 items-center justify-center text-[12.5px] text-default-400">Loading…</div>
      ) : total === 0 || !current ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-[13px] text-default-400 dark:text-white/40">
          <Icon name="inbox" variant="round" className="text-3xl" />
          <span>No deliveries to review</span>
        </div>
      ) : (
        <>
          <div className="shrink-0 px-4 pt-3 pb-2">
            <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-default-500 dark:text-white/50">
              <span>Reviewing <strong className="text-default-800 dark:text-white/90">{safeIdx + 1}</strong> of {total}</span>
              <span className="text-[10.5px] text-default-400">{awaiting} awaiting overall</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-default-200 dark:bg-white/8">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                style={{ width: `${((safeIdx + 1) / total) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto flex max-w-[640px] flex-col gap-4 rounded-2xl border border-default-200 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.02]">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-default-100 text-default-600 dark:bg-white/8 dark:text-white/65">
                  <Icon name={KIND_ICONS[current.kind] ?? "inventory_2"} variant="round" className="text-lg" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-default-400">
                    {current.agentSlug}
                  </div>
                  <div className="text-[15px] font-semibold text-default-900 dark:text-white">{current.title}</div>
                </div>
                <StatusPill status={current.status} />
              </div>

              {current.summary && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-[12.5px] leading-relaxed text-default-700 dark:border-amber-500/15 dark:bg-amber-500/5 dark:text-white/70">
                  <Icon name="format_quote" variant="round" className="mt-0.5 text-base text-amber-500" />
                  <span>{current.summary}</span>
                </div>
              )}

              <div>
                <ItemPreview item={current} />
              </div>

              <div className="flex items-center justify-between">
                <Confidence value={current.confidence} />
                <span className="text-[11px] text-default-400">
                  {new Date(current.createdAt).toLocaleString()}
                </span>
              </div>

              {showComment && (
                <div className="rounded-xl border border-default-200 bg-default-50 p-2.5 dark:border-white/10 dark:bg-white/[0.02]">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What should the agent change?"
                    rows={2}
                    className="w-full resize-none bg-transparent text-[13px] outline-none placeholder:text-default-400 dark:text-white/85"
                    autoFocus
                  />
                  <div className="mt-1 flex justify-end gap-1.5">
                    <Button size="sm" variant="light" onPress={() => { setShowComment(false); setComment(""); }}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      isDisabled={!comment.trim()}
                      onPress={() => act("request-changes", comment)}
                    >
                      Send feedback &amp; next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-t border-default-200 bg-white px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.03]">
            <Button
              size="sm"
              variant="light"
              isDisabled={safeIdx === 0}
              onPress={goPrev}
              startContent={<Icon name="arrow_back" variant="round" className="text-sm" />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={() => act("reject")}
              startContent={<Icon name="close" variant="round" className="text-sm" />}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="light"
              onPress={() => setShowComment((v) => !v)}
              startContent={<Icon name="chat_bubble_outline" variant="round" className="text-sm" />}
            >
              Request changes
            </Button>
            <div className="ml-auto flex gap-1.5">
              <Button
                size="sm"
                variant="flat"
                isDisabled={safeIdx >= total - 1}
                onPress={goNext}
                endContent={<Icon name="arrow_forward" variant="round" className="text-sm" />}
              >
                Skip
              </Button>
              <Button
                size="sm"
                color="primary"
                onPress={() => act("approve")}
                startContent={<Icon name="check" variant="round" className="text-sm" />}
              >
                Approve &amp; next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
