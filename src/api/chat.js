/**
 * Streaming tokens from SSE as an async generator.
 * Supports:
 *  - Raw OpenAI frames (choices[0].delta.content + [DONE])   [/api/chat/stream]
 *  - Normalized frames ({delta} or {text} + {done:true})      [/api/chat/stream-delta]
 *
 * Options:
 *   endpoint: override path, defaults to '/api/chat/stream'
 *   signal:   AbortSignal
 */
export async function* streamChat(
  req,
  { signal, endpoint = '/api/chat/stream' } = {}
) {
  const res = await fetch(withBase(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(req),
    signal,
  });

  if (!res.ok) throw new Error(`streamChat() failed: ${res.status}`);

  // Fallback: no streaming support, do a one-shot
  if (!res.body || !res.body.getReader) {
    const full = await chat(req);
    if (full?.text) yield full.text;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  // Parse one SSE frame into {event, data}
  const parseFrame = (frame) => {
    const lines = frame.split(/\r?\n/);
    let event = 'message';
    const dataLines = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith(':')) continue; // comment/keepalive
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    return { event, data: dataLines.join('\n') };
  };

  const extractToken = (obj) => {
    // Normalized server shapes
    if (typeof obj?.delta === 'string') return obj.delta;
    if (typeof obj?.text === 'string') return obj.text;
    // Raw OpenAI shape
    const d = obj?.choices?.[0]?.delta?.content;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      return d.map(p => (typeof p === 'string' ? p : (p?.text ?? ''))).join('');
    }
    return '';
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });

    // Split on blank line between SSE frames; handle \n\n and \r\n\r\n
    const frames = buf.split(/\r?\n\r?\n/);
    buf = frames.pop() || ''; // keep partial for next chunk

    for (const frame of frames) {
      const { event, data } = parseFrame(frame);
      if (!data) continue;

      // Raw OpenAI end sentinel
      if (data === '[DONE]') return;

      // Some routes send simple JSON objects per frame
      let obj = null;
      try { obj = JSON.parse(data); } catch { obj = null; }

      if (obj) {
        if (obj.error) throw new Error(obj.error);
        if (obj.done) return; // normalized done
        if (event === 'ready') continue; // connectivity ping from server
        if (event === 'tap' || event === 'tap-chunk') continue; // debug events

        const token = extractToken(obj);
        if (token) yield token;
      }
      // Ignore non-JSON frames quietly (e.g., retry:, id:, etc.)
    }
  }
}