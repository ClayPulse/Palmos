import { decode } from "@toon-format/toon";

export function parseToonToJSON(toon: string): any {
  const cleanedToon = removeToonCodeFences(toon);

  try {
    const decoded = decode(cleanedToon);
    return decoded;
  } catch (error) {
    // When error is "Unterminated string: missing closing quote", try add a quote at the end and decode again

    const fixedToon = cleanedToon + '"';
    const decoded = decode(fixedToon);
    return decoded;
  }
}

export function removeToonCodeFences(toon: string): string {
  const codeFenceRegex = /^```toon\n([\s\S]*?)\n(```)?$/;
  const match = toon.match(codeFenceRegex);
  return match ? match[1] : toon;
}
