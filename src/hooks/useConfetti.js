import { useEffect } from 'react';

export function useConfettiOn(trigger) {
  useEffect(() => {
    if (trigger) {
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
            });
          });
        }
      }, [trigger]);
    }