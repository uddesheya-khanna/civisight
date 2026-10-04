/**
 * useScrollProgress — normalises window scroll position against a
 * reference container to a value in [0, 1].
 *
 * Returns:
 *   progress  — React state, updated via rAF (used for DOM overlays)
 *   scrollRef — MutableRef updated synchronously in the scroll handler
 *               (safe to read inside useFrame without causing re-renders)
 */
import { useEffect, useRef, useState } from 'react';

export function useScrollProgress(containerRef: React.RefObject<HTMLDivElement>) {
  const scrollRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const max = el.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const onScroll = () => {
      compute();
      if (!ticking) {
        requestAnimationFrame(() => {
          setProgress(scrollRef.current);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    compute();
    setProgress(scrollRef.current);

    return () => window.removeEventListener('scroll', onScroll);
  }, [containerRef]);

  return { progress, scrollRef };
}
