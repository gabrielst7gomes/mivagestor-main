import { useEffect, useState } from "react";

/** true quando o usuário está rolando para baixo (e já passou de `threshold` px do topo). */
export function useScrollingDown(threshold = 24) {
  const [scrollingDown, setScrollingDown] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < threshold) return;
      setScrollingDown(y > lastY && y > threshold);
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrollingDown;
}
