import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { useCallback, useRef, useState } from "react";
import type { InterruptState, QAFormInterruptState, SubagentInfo, Todo, WorkflowInput } from "../types";

export default function useDeepAgent(
  apiUrl: string,
  _assistantId: string = "pulse-editor-assistant",
) {
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeInterrupt, setActiveInterrupt] = useState<InterruptState | null>(null);
  const [activeQAForm, setActiveQAForm] = useState<QAFormInterruptState | null>(null);

  const messageMapRef = useRef<Map<string, BaseMessage>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const syncDisplay = useCallback(() => {
    setMessages([...messageMapRef.current.values()]);
  }, []);

  const submit = useCallback(
    (text: string, workflows?: WorkflowInput[], uploadIds?: string[], projectId?: string) => {
      // Optimistically add user message
      const userMsg = new HumanMessage({
        content: text,
        additional_kwargs: uploadIds && uploadIds.length > 0
          ? { attachmentCount: uploadIds.length, uploadIds }
          : undefined,
      });
      const uid = userMsg.id ?? generateId();
      messageMapRef.current.set(uid, userMsg);
      syncDisplay();

      setIsLoading(true);
      setError(null);

      // Abort any previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const url = `${apiUrl}/manager/stream`;

      const payload = {
        messages: [...messageMapRef.current.values()].map((msg) => {
          return {
            role: HumanMessage.isInstance(msg) ? "user" : "assistant",
            content: msg.content,
          };
        }),
        workflows: workflows && workflows.length > 0 ? workflows : undefined,
        uploadIds: uploadIds && uploadIds.length > 0 ? uploadIds : undefined,
        projectId,
        options: {
          returnWorkflowConfig: false,
        },
      };

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Stream request failed: ${res.status}`);
          }
          return readSSEStream(res.body!, controller.signal, {
            onMessages: (data: unknown) => {
              // "messages" event format from LangGraph:
              // Without subgraphs: [messageChunk, metadata]
              // With subgraphs:    [namespace, "messages", [messageChunk, metadata]]
              if (!Array.isArray(data) || data.length < 2) return;

              let chunk: Record<string, any> | null;
              if (
                data.length >= 3 &&
                typeof data[0] === "string" &&
                Array.isArray(data[2])
              ) {
                // Subgraph format: [namespace, "messages", [chunk, meta]]
                chunk = data[2][0] as Record<string, any> | null;
              } else {
                // Direct format: [chunk, meta]
                chunk = data[0] as Record<string, any> | null;
              }
              if (!chunk) return;

              // Extract from LangChain serialized format
              const kwargs = chunk.kwargs ?? chunk;
              const rawContent = kwargs.content ?? "";
              // Normalize content: if it's an array of content blocks (e.g. from web search),
              // extract text from text blocks to avoid [object Object] when concatenating.
              // Also collect URL citations from annotations to display as sources.
              let content: string;
              if (Array.isArray(rawContent)) {
                const textParts: string[] = [];
                const citations: { url: string; title: string }[] = [];
                for (const b of rawContent) {
                  if (typeof b === "string") {
                    textParts.push(b);
                  } else if (typeof b === "object" && b !== null) {
                    if (b.type === "text") textParts.push(b.text ?? "");
                    // Extract URL citations from annotations (OpenAI web search format)
                    if (Array.isArray(b.annotations)) {
                      for (const ann of b.annotations) {
                        if (
                          ann &&
                          (ann.type === "url_citation" ||
                            ann.source === "url_citation") &&
                          typeof ann.url === "string"
                        ) {
                          if (!citations.some((c) => c.url === ann.url)) {
                            citations.push({
                              url: ann.url,
                              title: ann.title || ann.url,
                            });
                          }
                        }
                      }
                    }
                  }
                }
                content = textParts.join("");
                if (citations.length > 0) {
                  content +=
                    "\n\n**Sources:**\n" +
                    citations
                      .map((c, i) => `${i + 1}. [${c.title}](${c.url})`)
                      .join("\n");
                }
              } else {
                content = rawContent;
              }
              const msgId = kwargs.id ?? chunk.id ?? generateId();

              // Determine message type from serialized id path
              // e.g. ["langchain_core", "messages", "AIMessageChunk"]
              const lcId = Array.isArray(chunk.id) ? chunk.id : [];
              const typeName = lcId[lcId.length - 1] ?? "";
              const kind = kwargs.type ?? kwargs.role ?? typeName ?? "";

              // For streaming, we accumulate content for the same message ID
              const existing = messageMapRef.current.get(msgId);
              if (existing && existing._getType() !== "human") {
                // Append token to existing message
                const prev =
                  typeof existing.content === "string" ? existing.content : "";
                const updated = coerceToBaseMessage({
                  type: existing._getType(),
                  content: prev + content,
                  id: msgId,
                  additional_kwargs:
                    (existing as any).additional_kwargs ??
                    kwargs.additional_kwargs,
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
            },
            onValues: (data: unknown) => {
              if (data == null || typeof data !== "object") return;
              const state = data as Record<string, unknown>;

              // Manager agent result format: { text, attachments } or legacy { agentMessage, operations }
              if (typeof state.text === "string" && state.text) {
                const id = generateId();
                messageMapRef.current.set(
                  id,
                  new AIMessage({ content: state.text as string, id }),
                );
                syncDisplay();
              } else if (
                typeof state.agentMessage === "string" &&
                state.agentMessage
              ) {
                const id = generateId();
                messageMapRef.current.set(
                  id,
                  new AIMessage({ content: state.agentMessage, id }),
                );
                syncDisplay();
              }

              // LangGraph format: { messages: [...] }
              if (Array.isArray(state.messages)) {
                for (const raw of state.messages) {
                  const msg = coerceFromLCSerialized(raw);
                  if (!msg) continue;
                  if (msg._getType() === "human") continue;
                  const id = msg.id ?? generateId();
                  if (!messageMapRef.current.has(id)) {
                    messageMapRef.current.set(id, msg);
                  }
                }
                syncDisplay();
              }

              if (Array.isArray(state.todos)) {
                setTodos(state.todos as Todo[]);
              }
            },
            onError: (data: unknown) => {
              const errData = data as Record<string, string> | null;
              setError(new Error(errData?.message ?? "Unknown agent error"));
            },
            onInterrupt: (data: unknown) => {
              const d = data as { threadId?: string; interrupts?: Array<{ value?: { kind?: string; question?: string; context?: string; title?: string; description?: string; fields?: any[] } }> } | null;
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
            },
          });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [apiUrl, syncDisplay],
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

      const url = `${apiUrl}/manager/stream`;

      fetch(url, {
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
          options: { returnWorkflowConfig: false },
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Resume request failed: ${res.status}`);
          return readSSEStream(res.body!, controller.signal, {
            onMessages: (data: unknown) => {
              if (!Array.isArray(data) || data.length < 2) return;
              let chunk: Record<string, any> | null;
              if (data.length >= 3 && typeof data[0] === "string" && Array.isArray(data[2])) {
                chunk = data[2][0] as Record<string, any> | null;
              } else {
                chunk = data[0] as Record<string, any> | null;
              }
              if (!chunk) return;
              const kwargs = chunk.kwargs ?? chunk;
              const content = kwargs.content ?? "";
              const msgId = kwargs.id ?? chunk.id ?? generateId();
              const lcId = Array.isArray(chunk.id) ? chunk.id : [];
              const typeName = lcId[lcId.length - 1] ?? "";
              const kind = kwargs.type ?? kwargs.role ?? typeName ?? "";
              const existing = messageMapRef.current.get(msgId);
              if (existing && existing._getType() !== "human") {
                const prev = typeof existing.content === "string" ? existing.content : "";
                const updated = coerceToBaseMessage({ type: existing._getType(), content: prev + content, id: msgId, additional_kwargs: (existing as any).additional_kwargs ?? kwargs.additional_kwargs, tool_calls: (existing as any).tool_calls ?? kwargs.tool_calls });
                if (updated) messageMapRef.current.set(msgId, updated);
              } else if (content || kind) {
                const msg = coerceToBaseMessage({ ...kwargs, type: kind, content, id: msgId });
                if (msg) messageMapRef.current.set(msgId, msg);
              }
              syncDisplay();
            },
            onValues: () => {},
            onError: (data: unknown) => {
              const errData = data as Record<string, string> | null;
              setError(new Error(errData?.message ?? "Unknown agent error"));
            },
            onInterrupt: (data: unknown) => {
              const d = data as { threadId?: string; interrupts?: Array<{ value?: { kind?: string; question?: string; context?: string; title?: string; description?: string; fields?: any[] } }> } | null;
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
                  setActiveInterrupt({ threadId: d.threadId, question: val.question ?? "", context: val.context });
                }
              }
            },
          });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [apiUrl, syncDisplay, activeInterrupt, activeQAForm],
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
    setTodos([]);
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

  const getSubagentsByMessage = useCallback(
    (_messageId: string): SubagentInfo[] => {
      // Subagent tracking not implemented in manual SSE mode
      return [];
    },
    [],
  );

  return {
    messages,
    isLoading,
    error,
    todos,
    subagents: [] as SubagentInfo[],
    activeInterrupt,
    activeQAForm,
    submit,
    resume,
    resumeQAForm,
    stop,
    clear,
    loadMessages,
    getSubagentsByMessage,
  };
}

// ---------------------------------------------------------------------------
// SSE parser
// ---------------------------------------------------------------------------

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

      // Parse complete SSE events from buffer
      const parts = buffer.split("\n\n");
      // Last part may be incomplete
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = "";
        let dataStr = "";

        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr += line.slice(6);
          } else if (line.startsWith("id: ")) {
            // ignore
          }
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
            // no-op
            break;
          default:
            // Unknown event types — try as messages
            handlers.onMessages(parsed);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  return `msg-${Date.now()}-${_idCounter++}`;
}

/**
 * Convert a LangChain serialized message (lc/type/id/kwargs format)
 * into a BaseMessage instance.
 */
function coerceFromLCSerialized(raw: unknown): BaseMessage | null {
  if (raw instanceof BaseMessage) return raw;
  if (raw == null || typeof raw !== "object") return null;

  const obj = raw as Record<string, any>;

  // LangChain serialized: { lc: 1, type: "constructor", id: [..., "HumanMessage"], kwargs: { content, id, ... } }
  if (obj.lc && obj.type === "constructor" && obj.kwargs) {
    const kwargs = obj.kwargs;
    const lcId = Array.isArray(obj.id) ? obj.id : [];
    const typeName = lcId[lcId.length - 1] ?? "";
    return coerceToBaseMessage({
      ...kwargs,
      type: typeName,
      content: kwargs.content ?? "",
      id: kwargs.id,
    });
  }

  // Fallback to regular coercion
  return coerceToBaseMessage(raw);
}

/**
 * Convert a raw message object into a BaseMessage instance.
 */
function coerceToBaseMessage(raw: unknown): BaseMessage | null {
  if (raw instanceof BaseMessage) return raw;
  if (raw == null || typeof raw !== "object") return null;

  const msg = raw as Record<string, any>;
  const content = msg.content ?? "";
  const id = msg.id ?? undefined;
  const kind =
    msg.type ?? msg._type ?? msg.role ?? msg._getType?.() ?? undefined;

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
      return new ToolMessage({
        content,
        id,
        tool_call_id: msg.tool_call_id ?? "",
      });
    default:
      if (content) return new AIMessage({ content, id });
      return null;
  }
}
