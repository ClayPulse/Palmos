"use client";

import { TextBlock } from "../chat-blocks/text/text-block";

export function AIMessage({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <TextBlock type="ai" content={content} isStreaming={isStreaming} />
    </div>
  );
}
