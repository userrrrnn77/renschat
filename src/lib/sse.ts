export async function* parseSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let eventType = "message";
  let dataLines: string[] = [];

  // SSE spec §9.2.6: only one leading U+0020 is stripped from a field value.
  const stripOneSpace = (value: string): string =>
    value.startsWith(" ") ? value.slice(1) : value;

  const consumeBlock = (block: string): void => {
    for (const line of block.split("\n")) {
      // Empty line inside a block (shouldn't happen) or a comment (`: ping`).
      if (line.length === 0 || line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      // Field name without value: per spec we could use it, but no
      // supported field is a bare name, so ignore it.
      if (colon === -1) continue;
      const field = line.slice(0, colon);
      const value = stripOneSpace(line.slice(colon + 1));
      if (field === "event") {
        eventType = value;
      } else if (field === "data") {
        dataLines.push(value);
      }
      // `id` and `retry` are intentionally ignored by this client.
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      if (done) {
        buffer += decoder.decode();
        // End of stream: a trailing \r can no longer be part of a CRLF
        // whose \n arrives in a later chunk, so normalizing all remaining
        // \r (including a lone one) to \n is safe now.
        buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      } else {
        // Normalize CRLF → LF and lone CR → LF, but keep a trailing \r
        // untouched: the next chunk may begin with \n (CRLF split across
        // chunks) and turning the \r into a standalone \n would fabricate
        // an extra blank line / false event boundary.
        const endsWithCR = buffer.endsWith("\r");
        const working = endsWithCR ? buffer.slice(0, -1) : buffer;
        buffer =
          working.replace(/\r\n/g, "\n").replace(/\r/g, "\n") +
          (endsWithCR ? "\r" : "");
      }

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        consumeBlock(block);
        if (dataLines.length > 0) {
          yield { event: eventType, data: dataLines.join("\n") };
        }
        // Reset both buffers per spec, whether or not an event was yielded.
        eventType = "message";
        dataLines = [];
        boundary = buffer.indexOf("\n\n");
      }

      if (done) {
        // Lenient final flush: some servers omit the trailing blank line
        // for the last event. Dispatch whatever complete lines remain.
        if (buffer.length > 0) {
          consumeBlock(buffer);
          buffer = "";
          if (dataLines.length > 0) {
            yield { event: eventType, data: dataLines.join("\n") };
          }
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
