import { useCallback, useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TOURS, type TourKey } from "@/lib/tours";
import { useAuth } from "@/contexts/AuthContext";

const storageKey = (key: TourKey) => `tour_seen_${key}`;
// Only auto-start tours for accounts this new; older users can replay via the help button.
const NEW_USER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const markSeen = (key: TourKey) => {
  try {
    localStorage.setItem(storageKey(key), "1");
  } catch {
    /* ignore */
  }
};

export function usePageTour(key: TourKey) {
  const createdAt = useAuth().user?.created_at;
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
      onDestroyed: () => markSeen(key),
      steps,
    });

    markSeen(key); // count as seen even if the user navigates away mid-tour
    d.drive();
  }, [key]);

  useEffect(() => {
    if (!createdAt || startedRef.current) return;
    const isNewUser = Date.now() - new Date(createdAt).getTime() < NEW_USER_WINDOW_MS;
    if (!isNewUser) return;
    let seen = false;
    try {
      seen = !!localStorage.getItem(storageKey(key));
    } catch {
      /* ignore */
    }
    if (!seen) {
      // Wait one tick so target elements are mounted.
      const t = setTimeout(() => {
        startedRef.current = true;
        startTour();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [key, startTour, createdAt]);

  return { startTour };
}
