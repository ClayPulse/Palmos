import { decode } from "@toon-format/toon";

export function parseToonToJSON(content: string): any {
  if (!isToonFormat(content)) {
    return content;
  }

  const cleanedToon = removeToonCodeFences(content);

  try {
    const decoded = decode(cleanedToon);
    return decoded;
  } catch (error) {
    // When error is "Unterminated string: missing closing quote", try add a quote at the end and decode again
    try {
      const fixedToon = cleanedToon + '"';
      const decoded = decode(fixedToon);
      return decoded;
    } catch (error) {
      console.warn("Failed to decode TOON content:", error);
    }
  }
}

export function removeToonCodeFences(toon: string): string {
  const codeFenceRegex = /^```toon\n([\s\S]*?)\n(```)?$/;
  const match = toon.match(codeFenceRegex);
  return match ? match[1] : toon;
}

export function isToonFormat(toon: string): boolean {
  const codeFenceRegex = /^```toon\n([\s\S]*?)\n(```)?$/;
  return codeFenceRegex.test(toon);
}
