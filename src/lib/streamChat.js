// lib/streamChat.ts
export async function streamChat(
  messages,
  {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    signal,
    onToken,   // (token, fullText) => void
    onDone,    // (fullText) => void
  } = {}
) {
  const resp = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ messages, model, temperature }),
    signal,
  });
  if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE frames (split on blank line)
    let sep = buffer.indexOf('\n\n');
    while (sep !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf('\n\n');

      for (const raw of frame.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith(':')) continue;
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();

        if (data === '[DONE]') {
          onDone?.(full);
          return full;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onToken?.(delta, full);
          }
        } catch {
          // non-JSON line, ignore
        }
      }
    }
  }
  onDone?.(full);
  return full;
}