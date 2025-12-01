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

/**
 * Parse NDJSON from a ReadableStream<string> and emit parsed objects as soon as they are complete.
 */
export async function parseNDJSONStream(
  stream: ReadableStream<string>,
  onData: (data: any) => Promise<void>,
) {
  const reader = stream.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        try {
          const parsed = JSON.parse(line);
          await onData(parsed);
        } catch {
          // If parsing fails, it might be a partial JSON.
          // Prepend line back to buffer for next chunk
          buffer = line + "\n" + buffer;
          break; // wait for more data
        }
      }
    }
  }

  // Try to parse any remaining buffer after the stream ends
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer);
      await onData(parsed);
    } catch (err) {
      console.error("Failed to parse trailing JSON:", buffer, err);
    }
  }
}
