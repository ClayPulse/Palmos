"use client";

import { TextBlock } from "../chat-blocks/text/text-block";

export function UserMessage({
  text,
  attachmentCount,
  uploadIds,
}: {
  text: string;
  attachmentCount?: number;
  uploadIds?: string[];
}) {
  return (
    <TextBlock
      type="user"
      text={text}
      attachmentCount={attachmentCount}
      uploadIds={uploadIds}
    />
  );
}
