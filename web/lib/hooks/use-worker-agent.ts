import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { useCallback, useRef, useState } from "react";
import type { InterruptState, QAFormInterruptState } from "../types";

// Per-marketplace-agent chat hook. Same SSE shape as the manager but
// targets /api/agent/worker/<slug>/stream and carries the slug in URL.
// One thread per (user, agentSlug) — the route derives the threadId,
// so we don't pass one ourselves.

export default function useWorkerAgent(apiBaseUrl: string, agentSlug: string) {
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeInterrupt, setActiveInterrupt] = useState<InterruptState | null>(null);
  const [activeQAForm, setActiveQAForm] = useState<QAFormInterruptState | null>(null);

  const messageMapRef = useRef<Map<string, BaseMessage>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const syncDisplay = useCallback(() => {
    setMessages([...messageMapRef.current.values()]);
  }, []);

  const streamUrl = `${apiBaseUrl}/agent/worker/${encodeURIComponent(agentSlug)}/stream`;

  const submit = useCallback(
    (text: string, uploadIds?: string[], sessionId?: string) => {
      const userMsg = new HumanMessage({
        content: text,
        additional_kwargs:
          uploadIds && uploadIds.length > 0
            ? { attachmentCount: uploadIds.length, uploadIds }
            : undefined,
      });
      const uid = userMsg.id ?? generateId();
      messageMapRef.current.set(uid, userMsg);
      syncDisplay();

      setIsLoading(true);
      setError(null);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const payload = {
        messages: [...messageMapRef.current.values()].map((msg) => ({
          role: HumanMessage.isInstance(msg) ? "user" : "assistant",
          content: msg.content,
        })),
        uploadIds: uploadIds && uploadIds.length > 0 ? uploadIds : undefined,
        sessionId,
      };

      fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Stream request failed: ${res.status}`);
          return readSSEStream(res.body!, controller.signal, {
            onMessages: makeOnMessages(messageMapRef, syncDisplay),
            onValues: () => {},
            onError: (data: any) =>
              setError(new Error(data?.message ?? "Unknown agent error")),
            onInterrupt: (data: any) =>
              applyInterrupt(data, setActiveInterrupt, setActiveQAForm),
          });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        })
        .finally(() => setIsLoading(false));
    },
    [streamUrl, syncDisplay],
  );

  const resume = useCallback(
    (reply: string) => {
      const threadId = activeInterrupt?.threadId ?? activeQAForm?.threadId;
      if (!threadId) return;
      setActiveInterrupt(null);
      setActiveQAForm(null);
      setIsLoading(true);
      setError(null);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...messageMapRef.current.values()].map((msg) => ({
            role: HumanMessage.isInstance(msg) ? "user" : "assistant",
            content: msg.content,
          })),
          threadId,
          resume: reply,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Resume request failed: ${res.status}`);
          return readSSEStream(res.body!, controller.signal, {
            onMessages: makeOnMessages(messageMapRef, syncDisplay),
            onValues: () => {},
            onError: (data: any) =>
              setError(new Error(data?.message ?? "Unknown agent error")),
            onInterrupt: (data: any) =>
              applyInterrupt(data, setActiveInterrupt, setActiveQAForm),
          });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        })
        .finally(() => setIsLoading(false));
    },
    [streamUrl, syncDisplay, activeInterrupt, activeQAForm],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    messageMapRef.current.clear();
    setMessages([]);
    setIsLoading(false);
    setError(null);
    setActiveInterrupt(null);
    setActiveQAForm(null);
  }, []);

  const resumeQAForm = useCallback(
    (formData: Record<string, any>) => {
      if (!activeQAForm) return;
      resume(JSON.stringify(formData));
    },
    [activeQAForm, resume],
  );

  const loadMessages = useCallback(
    (msgs: BaseMessage[]) => {
      messageMapRef.current.clear();
      for (const msg of msgs) {
        const id = msg.id ?? generateId();
        messageMapRef.current.set(id, msg);
      }
      syncDisplay();
    },
    [syncDisplay],
  );

  return {
    messages,
    isLoading,
    error,
    activeInterrupt,
    activeQAForm,
    submit,
    resume,
    resumeQAForm,
    stop,
    clear,
    loadMessages,
  };
}

// ---------------------------------------------------------------------------
// Shared SSE helpers (slimmer copy of useDeepAgent's parser — kept local so
// changes to the manager hook don't quietly affect worker chats and vice versa).
// ---------------------------------------------------------------------------

function makeOnMessages(
  messageMapRef: React.MutableRefObject<Map<string, BaseMessage>>,
  syncDisplay: () => void,
) {
  return (data: unknown) => {
    if (!Array.isArray(data) || data.length < 2) return;

    let chunk: Record<string, any> | null;
    if (data.length >= 3 && typeof data[0] === "string" && Array.isArray(data[2])) {
      chunk = data[2][0] as Record<string, any> | null;
    } else {
      chunk = data[0] as Record<string, any> | null;
    }
    if (!chunk) return;

    const kwargs = chunk.kwargs ?? chunk;
    const rawContent = kwargs.content ?? "";
    let content: string;
    if (Array.isArray(rawContent)) {
      const textParts: string[] = [];
      const citations: { url: string; title: string }[] = [];
      for (const b of rawContent) {
        if (typeof b === "string") {
          textParts.push(b);
        } else if (typeof b === "object" && b !== null) {
          if (b.type === "text") textParts.push(b.text ?? "");
          if (Array.isArray(b.annotations)) {
            for (const ann of b.annotations) {
              if (
                ann &&
                (ann.type === "url_citation" || ann.source === "url_citation") &&
                typeof ann.url === "string" &&
                !citations.some((c) => c.url === ann.url)
              ) {
                citations.push({ url: ann.url, title: ann.title || ann.url });
              }
            }
          }
        }
      }
      content = textParts.join("");
      if (citations.length > 0) {
        content +=
          "\n\n**Sources:**\n" +
          citations.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join("\n");
      }
    } else {
      content = rawContent;
    }

    const msgId = kwargs.id ?? chunk.id ?? generateId();
    const lcId = Array.isArray(chunk.id) ? chunk.id : [];
    const typeName = lcId[lcId.length - 1] ?? "";
    const kind = kwargs.type ?? kwargs.role ?? typeName ?? "";

    const existing = messageMapRef.current.get(msgId);
    if (existing && existing._getType() !== "human") {
      const prev = typeof existing.content === "string" ? existing.content : "";
      const updated = coerceToBaseMessage({
        type: existing._getType(),
        content: prev + content,
        id: msgId,
        additional_kwargs:
          (existing as any).additional_kwargs ?? kwargs.additional_kwargs,
        tool_calls: (existing as any).tool_calls ?? kwargs.tool_calls,
      });
      if (updated) messageMapRef.current.set(msgId, updated);
    } else if (content || kind) {
      const msg = coerceToBaseMessage({
        ...kwargs,
        type: kind,
        content,
        id: msgId,
      });
      if (msg) messageMapRef.current.set(msgId, msg);
    }
    syncDisplay();
  };
}

function applyInterrupt(
  data: any,
  setActiveInterrupt: (v: InterruptState | null) => void,
  setActiveQAForm: (v: QAFormInterruptState | null) => void,
) {
  const d = data as
    | {
        threadId?: string;
        interrupts?: Array<{
          value?: {
            kind?: string;
            question?: string;
            context?: string;
            title?: string;
            description?: string;
            fields?: any[];
          };
        }>;
      }
    | null;
  if (d?.threadId && d.interrupts?.[0]?.value) {
    const val = d.interrupts[0].value;
    if (val.kind === "qa_form" && val.fields) {
      setActiveQAForm({
        threadId: d.threadId,
        title: val.title ?? "",
        description: val.description ?? undefined,
        fields: val.fields,
      });
    } else {
      setActiveInterrupt({
        threadId: d.threadId,
        question: val.question ?? "",
        context: val.context,
      });
    }
  }
}

interface SSEHandlers {
  onMessages: (data: unknown) => void;
  onValues: (data: unknown) => void;
  onError: (data: unknown) => void;
  onInterrupt?: (data: unknown) => void;
}

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  handlers: SSEHandlers,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;
        let eventType = "";
        let dataStr = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataStr += line.slice(6);
        }
        if (!eventType || !dataStr) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(dataStr);
        } catch {
          continue;
        }
        switch (eventType) {
          case "messages":
            handlers.onMessages(parsed);
            break;
          case "values":
          case "result":
            handlers.onValues(parsed);
            break;
          case "error":
            handlers.onError(parsed);
            break;
          case "interrupt":
            handlers.onInterrupt?.(parsed);
            break;
          case "metadata":
          case "end":
            break;
          default:
            handlers.onMessages(parsed);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

let _idCounter = 0;
function generateId(): string {
  return `wmsg-${Date.now()}-${_idCounter++}`;
}

function coerceToBaseMessage(raw: unknown): BaseMessage | null {
  if (raw instanceof BaseMessage) return raw;
  if (raw == null || typeof raw !== "object") return null;
  const msg = raw as Record<string, any>;
  const content = msg.content ?? "";
  const id = msg.id ?? undefined;
  const kind = msg.type ?? msg._type ?? msg.role ?? msg._getType?.() ?? undefined;
  switch (kind) {
    case "human":
    case "user":
    case "HumanMessage":
    case "HumanMessageChunk":
      return new HumanMessage({ content, id });
    case "ai":
    case "assistant":
    case "AIMessage":
    case "AIMessageChunk":
      return new AIMessage({
        content,
        id,
        additional_kwargs: msg.additional_kwargs,
        tool_calls: msg.tool_calls,
      });
    case "system":
    case "SystemMessage":
    case "SystemMessageChunk":
      return new SystemMessage({ content, id });
    case "tool":
    case "ToolMessage":
    case "ToolMessageChunk":
      return new ToolMessage({ content, id, tool_call_id: msg.tool_call_id ?? "" });
    default:
      if (content) return new AIMessage({ content, id });
      return null;
  }
}
