"use client";

import { useEffect, useState } from "react";

/**
 * Marks its children hidden (`data-hidden`, read via `group-data-[hidden]/show:`)
 * until the element `targetId` has scrolled up past the top of the screen. Used
 * so the mobile contact bar only slides in once the hero buttons scroll away.
 * No transform on this wrapper: it would break `position: fixed` children.
 */
export function ShowAfter({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) {
      setHidden(false);
      return;
    }
    const onScroll = () => setHidden(el.getBoundingClientRect().bottom > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div className="group/show" data-hidden={hidden || undefined}>
      {children}
    </div>
  );
}
