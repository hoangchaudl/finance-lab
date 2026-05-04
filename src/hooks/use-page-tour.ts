import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOURS, type TourKey } from "@/lib/tours";

const storageKey = (key: TourKey) => `tour_seen_${key}`;

export function usePageTour(key: TourKey) {
  const startedRef = useRef(false);

  const startTour = useCallback(() => {
    const steps = TOURS[key];
    if (!steps?.length) return;

    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: "fl-tour",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Got it",
      onDestroyed: () => {
        try {
          localStorage.setItem(storageKey(key), "1");
        } catch {
          /* ignore */
        }
      },
      steps,
    });

    d.drive();
  }, [key]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let seen = false;
    try {
      seen = !!localStorage.getItem(storageKey(key));
    } catch {
      /* ignore */
    }
    if (!seen) {
      // Wait one tick so target elements are mounted.
      const t = setTimeout(() => startTour(), 350);
      return () => clearTimeout(t);
    }
  }, [key, startTour]);

  return { startTour };
}
