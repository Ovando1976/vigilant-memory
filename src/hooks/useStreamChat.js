import { useRef, useState } from 'react';
import { streamChat } from '../api/chat';

export function useStreamChat() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const start = async ({ messages, model = 'gpt-4o-mini', temperature = 0.7 } = {}) => {
    // stop any previous stream
    stop();

    setText('');
    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const token of streamChat({ messages, model, temperature }, { signal: controller.signal })) {
        setText((prev) => prev + token);
      }
    } catch (e) {
      if (controller.signal.aborted) return; // user canceled
      console.error(e);
      setError(e);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  return { text, isStreaming, error, start, stop };
}