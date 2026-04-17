import type { BaseMessage } from "@langchain/core/messages";

export function formatRelativeTime(
  ts: number,
  t?: (key: string, vars?: Record<string, any>) => string,
): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t ? t("sessionHistory.justNow") : "Just now";
  if (minutes < 60)
    return t ? t("sessionHistory.mAgo", { count: minutes }) : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t ? t("sessionHistory.hAgo", { count: hours }) : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)
    return t ? t("sessionHistory.dAgo", { count: days }) : `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function getLastAIContent(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg._getType() === "ai") {
      const content = msg.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .filter(
            (b): b is { type: "text"; text: string } =>
              typeof b === "object" &&
              b !== null &&
              "type" in b &&
              b.type === "text",
          )
          .map((b) => b.text)
          .join("");
      }
    }
  }
  return "";
}
