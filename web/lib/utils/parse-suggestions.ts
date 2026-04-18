const SUGGESTIONS_RE = /<!--suggestions:(.*?)-->/;

export function parseSuggestions(content: string): {
  text: string;
  suggestions: string[];
} {
  const match = content.match(SUGGESTIONS_RE);
  if (!match) return { text: content, suggestions: [] };

  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return {
        text: content.replace(SUGGESTIONS_RE, "").trimEnd(),
        suggestions: parsed,
      };
    }
  } catch {
    // malformed — ignore
  }
  return { text: content, suggestions: [] };
}
