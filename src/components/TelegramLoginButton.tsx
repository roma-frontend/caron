'use client';

import { useEffect, useRef } from 'react';

export type TelegramAuthUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

/**
 * Renders the official Telegram Login Widget. On successful authorization the
 * widget invokes `onAuth` with the signed payload, which the caller forwards to
 * the `auth.loginWithTelegram` mutation for server-side HMAC verification.
 *
 * Requires NEXT_PUBLIC_TELEGRAM_BOT_USERNAME and the bot's domain to be set in
 * BotFather (/setdomain). Renders nothing when the env var is missing, so the
 * page degrades gracefully to email/password only.
 */
export function TelegramLoginButton({
  onAuth,
  cornerRadius = 8,
}: {
  onAuth: (user: TelegramAuthUser) => void;
  cornerRadius?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest callback without re-injecting the script on every render.
  const cbRef = useRef(onAuth);
  useEffect(() => {
    cbRef.current = onAuth;
  }, [onAuth]);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    const el = containerRef.current;
    if (!botUsername || !el) return;

    const w = window as unknown as { onTelegramAuth?: (u: TelegramAuthUser) => void };
    w.onTelegramAuth = (u) => cbRef.current(u);

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    el.appendChild(script);

    return () => {
      el.innerHTML = '';
      delete w.onTelegramAuth;
    };
  }, [botUsername, cornerRadius]);

  if (!botUsername) return null;
  return (
    <>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        կամ
        <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
