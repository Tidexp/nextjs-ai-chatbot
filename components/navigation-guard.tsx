'use client';

import { useEffect, useRef } from 'react';

// Session-specific navigation tracking (per tab)
const SESSION_KEY = `nav_session_${Date.now()}_${Math.random()}`;
const MAX_NAV_PER_SECOND = 2;
const NAVIGATION_WINDOW = 1000; // 1 second

export function NavigationGuard() {
  const navigationTimestamps = useRef<number[]>([]);
  const isBlockingRef = useRef(false);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Mark this tab as active
    sessionStorage.setItem(SESSION_KEY, 'active');
    // Add global navigation blocked flag
    if (typeof window !== 'undefined') {
      (window as any).__NAV_BLOCKED__ = false;
    }

    const handlePopState = (e: PopStateEvent) => {
      const now = Date.now();

      // Clean old timestamps (older than 1 second)
      navigationTimestamps.current = navigationTimestamps.current.filter(
        (timestamp) => now - timestamp < NAVIGATION_WINDOW,
      );

      // Check if we're exceeding the navigation limit
      if (navigationTimestamps.current.length >= MAX_NAV_PER_SECOND) {
        console.warn(
          '[NavigationGuard] Navigation rate limit exceeded - blocking',
        );
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof window !== 'undefined') {
          (window as any).__NAV_BLOCKED__ = true;
        }

        // Show user feedback
        if (!isBlockingRef.current) {
          isBlockingRef.current = true;

          // Auto-unblock after 1 second
          if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
          cleanupTimerRef.current = setTimeout(() => {
            navigationTimestamps.current = [];
            isBlockingRef.current = false;
            if (typeof window !== 'undefined') {
              (window as any).__NAV_BLOCKED__ = false;
            }
            console.log('[NavigationGuard] Navigation unblocked');
          }, 1000);
        }
        return;
      }

      // Record this navigation
      navigationTimestamps.current.push(now);
      if (typeof window !== 'undefined') {
        (window as any).__NAV_BLOCKED__ = false;
      }
    };

    const handleVisibilityChange = () => {
      // Reset navigation tracking when tab becomes visible
      // This fixes the "new tab crash" issue
      if (!document.hidden) {
        console.log(
          '[NavigationGuard] Tab visible - resetting navigation state',
        );
        navigationTimestamps.current = [];
        isBlockingRef.current = false;
        if (cleanupTimerRef.current) {
          clearTimeout(cleanupTimerRef.current);
          cleanupTimerRef.current = null;
        }
        if (typeof window !== 'undefined') {
          (window as any).__NAV_BLOCKED__ = false;
        }
      }
    };

    const handleBeforeUnload = () => {
      // Cleanup session
      sessionStorage.removeItem(SESSION_KEY);
      navigationTimestamps.current = [];
      isBlockingRef.current = false;
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      if (typeof window !== 'undefined') {
        (window as any).__NAV_BLOCKED__ = false;
      }
    };

    // Use capture phase to intercept early
    window.addEventListener('popstate', handlePopState, {
      capture: true,
      passive: false,
    } as any);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      sessionStorage.removeItem(SESSION_KEY);
      navigationTimestamps.current = [];
      isBlockingRef.current = false;
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
      window.removeEventListener('popstate', handlePopState, {
        capture: true,
      } as any);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof window !== 'undefined') {
        (window as any).__NAV_BLOCKED__ = false;
      }
    };
  }, []);

  return null;
}
