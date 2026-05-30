'use client';

import { useCallback } from 'react';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useAuthStore } from '@/store/auth';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { clearAuthCookie } from '@/actions/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export function IdleTimeoutModal() {
  const logoutStore = useAuthStore((s) => s.logout);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const logoutMutation = useMutation(api.auth.logout);

  const doLogout = useCallback(async () => {
    if (sessionToken) {
      try { await logoutMutation({ sessionToken }); } catch {}
    }
    logoutStore();
    await clearAuthCookie();
    window.location.href = '/login';
  }, [sessionToken, logoutMutation, logoutStore]);

  const { showWarning, countdownSeconds, extendSession } = useIdleTimer({
    onLogout: doLogout,
  });

  if (!showWarning) return null;

  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;

  return (
    <Dialog open={showWarning} onOpenChange={() => extendSession()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-7 w-7 text-amber-500 animate-pulse" />
          </div>
          <DialogTitle className="text-center">Սեսիան ավարտվել է</DialogTitle>
          <DialogDescription className="text-center">Ձեր սեսիան ավարտվել է։ Մուտք գործեք նորից:</DialogDescription>
        </DialogHeader>
        <div className="text-center text-3xl font-mono font-bold text-amber-500 py-2">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="space-y-2 pt-2">
          <Button onClick={extendSession} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Թարմացնել
          </Button>
          <Button onClick={doLogout} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Դուրս գալ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}