export function parseJsonChunk(chunk: string): any[] {
  const jsonObjects = [];
  let braceCount = 0;
  let current = "";

  for (const char of chunk.trim()) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;

    current += char;

    if (braceCount === 0 && current.trim()) {
      try {
        jsonObjects.push(JSON.parse(current));
      } catch (e) {
        console.error("Error parsing JSON object:", current, e);
      }
      current = "";
    }
  }

  return jsonObjects;
}
