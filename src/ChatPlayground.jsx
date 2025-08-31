import { useState } from 'react';
import { useStreamChat } from './hooks/useStreamChat';
import { chat } from './api/chat';

export default function ChatPlayground() {
  const [input, setInput] = useState('');
  const { text, isStreaming, error, start, stop } = useStreamChat();

  const handleStream = async () => {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: input || 'Say hello in five short words.' },
    ];
    start({ messages });
  };

  const handleNonStreaming = async () => {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: input || 'Give me a one-sentence greeting.' },
    ];
    const res = await chat({ messages });
    alert(res.text);
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h2>Chat Streaming Test</h2>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a prompt…"
        />
        <button onClick={handleStream} disabled={isStreaming}>Stream</button>
        <button onClick={stop} disabled={!isStreaming}>Stop</button>
        <button onClick={handleNonStreaming}>Non‑stream</button>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: '1px solid #ddd', minHeight: 120, whiteSpace: 'pre-wrap' }}>
        {text || (isStreaming ? '…' : 'Streaming output shows here')}
      </div>

      {error && (
        <div style={{ marginTop: 8, color: 'crimson' }}>
          Error: {String(error.message || error)}
        </div>
      )}
    </div>
  );
}