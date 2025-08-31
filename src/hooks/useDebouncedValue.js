import { useEffect, useRef, useState } from "react";

/** Returns a debounced copy of `value` that only updates after `delay` ms. */
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}