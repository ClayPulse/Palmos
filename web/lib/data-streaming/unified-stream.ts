/**
 *  Convert a HTTP response body stream to corresponding ReadableStream for nodejs or web.
 */
export function toUnifiedStream(stream: ReadableStream<Uint8Array>) {
  return new ReadableStream({
    async start(controller) {
      if (
        typeof ReadableStream !== "undefined" &&
        stream instanceof ReadableStream
      ) {
        // Run with web stream reader
        const reader = stream.getReader();

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      } else {
        // Run with node.js
        for await (const chunk of stream as any) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    },
  }).pipeThrough(new TextDecoderStream());
}
