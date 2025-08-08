import { useEffect } from 'react';

export function useConfettiOn(trigger) {
  useEffect(() => {
    let cancelled = false;

    if (trigger) {
      import('canvas-confetti')
        .then((confetti) => {
          if (!cancelled) {
            confetti.default({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        })
        .catch((err) => {
          console.error('Failed to load canvas-confetti', err);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [trigger]);
}

