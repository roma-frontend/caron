import { useState, useEffect, useCallback, useRef } from 'react';

const IDLE_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT || '900', 10) * 1000;
const WARNING_DURATION = parseInt(process.env.NEXT_PUBLIC_IDLE_WARNING || '60', 10) * 1000;

interface UseIdleTimerOptions {
  onIdle?: () => void;
  onLogout?: () => void;
}

export function useIdleTimer({ onIdle, onLogout }: UseIdleTimerOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  const onLogoutRef = useRef(onLogout);

  onIdleRef.current = onIdle;
  onLogoutRef.current = onLogout;

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startIdleTimer = useCallback(() => {
    clearAllTimers();

    idleTimerRef.current = setTimeout(() => {
      warningRef.current = true;
      setShowWarning(true);
      setCountdownSeconds(Math.floor(WARNING_DURATION / 1000));
      onIdleRef.current?.();

      countdownRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      warningTimerRef.current = setTimeout(() => {
        onLogoutRef.current?.();
      }, WARNING_DURATION);
    }, IDLE_TIMEOUT);
  }, [clearAllTimers]);

  const extendSession = useCallback(() => {
    warningRef.current = false;
    setShowWarning(false);
    setCountdownSeconds(0);
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    startIdleTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!warningRef.current) startIdleTimer();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      clearAllTimers();
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [startIdleTimer, clearAllTimers]);

  return { showWarning, countdownSeconds, extendSession };
}
