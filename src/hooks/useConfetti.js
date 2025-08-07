import { useEffect } from 'react';

export function useConfettiOn(trigger) {
  useEffect(() => {
    let cancelled = false;

    if (trigger) {
      import('canvas-confetti').then(({ default: confetti }) => {
        if (!cancelled) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [trigger]);
}

