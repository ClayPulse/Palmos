"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import useEditorAIAssistant from "@/lib/hooks/use-editor-ai-assistant";
import { EditorChatMessage, UserMessage } from "@/lib/types";
import { Button, Input, Spinner } from "@heroui/react";
import { useContext, useEffect, useRef, useState } from "react";
import BaseSidePanel from "./base-side-panel";
import MarkdownRender from "@/components/misc/markdown-render";

export default function ChatPanel() {
  const editorContext = useContext(EditorContext);
  const { history, chatWithAssistant } = useEditorAIAssistant();
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOpen = editorContext?.editorStates.isChatPanelOpen ?? false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isSending) return;
    const msg: UserMessage = { content: { text }, attachments: [] };
    setInputText("");
    setIsSending(true);
    try {
      await chatWithAssistant(msg, false);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <BaseSidePanel isOpen={isOpen} direction="right">
      <div className="h-full w-full overflow-y-hidden min-[768px]:py-2 min-[768px]:pl-1 min-[768px]:pr-2">
        <div className="bg-content2 grid h-full w-full grid-rows-[48px_1fr_max-content] overflow-hidden shadow-md min-[768px]:rounded-xl">
          {/* Header */}
          <div className="relative flex h-full w-full items-center justify-center border-b border-default-200">
            <span className="text-sm font-semibold">AI Assistant</span>
            <div className="absolute right-0 flex h-full items-center px-2">
              <Button
                isIconOnly
                variant="light"
                onPress={() =>
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isChatPanelOpen: false,
                  }))
                }
              >
                <Icon name="close" variant="round" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-2 overflow-y-auto p-3">
            {history.length === 0 && (
              <p className="text-default-400 mt-4 text-center text-sm">
                Ask the AI assistant anything about your workspace.
              </p>
            )}
            {history.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-content3 rounded-xl px-3 py-2">
                  <Spinner size="sm" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-default-200 px-3 py-2">
            <Input
              className="flex-1"
              placeholder="Ask the AI assistant..."
              value={inputText}
              onValueChange={setInputText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              size="sm"
              isDisabled={isSending}
            />
            <Button
              isIconOnly
              size="sm"
              color="primary"
              onPress={handleSend}
              isDisabled={!inputText.trim() || isSending}
            >
              <Icon name="send" variant="round" />
            </Button>
          </div>
        </div>
      </div>
    </BaseSidePanel>
  );
}

function ChatBubble({ message }: { message: EditorChatMessage }) {
  const isUser = message.role === "user";
  const text = (message.message as { content?: { text?: string } }).content
    ?.text;

  if (!text) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-content3 text-content3-foreground"
        }`}
      >
        {isUser ? (
          text
        ) : (
          <MarkdownRender content={text} />
        )}
      </div>
    </div>
  );
}
