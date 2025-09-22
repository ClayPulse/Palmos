export function parseJsonChunk(chunk: string) {
  const jsonObjects = [];
  // Replace multiple spaces or other delimiters with a single space and trim
  const cleanedChunk = chunk.trim();

  // Use a regular expression to match JSON objects
  // This assumes objects are separated by spaces and are valid JSON
  const jsonRegex = /({[^{}]*})/g;
  const matches = cleanedChunk.match(jsonRegex);

  if (matches) {
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match);
        jsonObjects.push(parsed);
      } catch (error) {
        console.error("Error parsing JSON object:", match, error);
      }
    }
  }

  return jsonObjects;
}
