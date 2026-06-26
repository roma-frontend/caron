'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useT } from '@/lib/i18n/admin';

export type TelegramAuthUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type TelegramLogin = {
  auth: (
    opts: { bot_id: string | number; request_access?: string | boolean },
    cb: (user: TelegramAuthUser | false) => void,
  ) => void;
};

const SCRIPT_ID = 'telegram-widget-js';

/**
 * Custom "Մուտք Telegram-ով" button. We avoid Telegram's auto-rendered iframe
 * button (whose "Log in as …" label can't be localized to Armenian) and instead
 * load telegram-widget.js only for its `Telegram.Login.auth` API, then trigger
 * the auth popup from our own branded button.
 *
 * The numeric bot id comes from a Convex query (public token prefix). The bot's
 * domain must still be set in BotFather. Renders nothing until the bot id loads.
 */
export function TelegramLoginButton({ onAuth }: { onAuth: (user: TelegramAuthUser) => void }) {
  const { t } = useT();
  const cbRef = useRef(onAuth);
  useEffect(() => {
    cbRef.current = onAuth;
  }, [onAuth]);

  const botId = useQuery(api.auth.telegramBotId, {});
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && !!(window as unknown as { Telegram?: { Login?: TelegramLogin } }).Telegram?.Login,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Telegram?: { Login?: TelegramLogin } };
    if (w.Telegram?.Login) return; // already loaded — initializer already set ready
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, []);

  if (!botId) return null; // not configured (no bot token in Convex)

  const handleClick = () => {
    const w = window as unknown as { Telegram?: { Login?: TelegramLogin } };
    const login = w.Telegram?.Login;
    if (!login) return;
    login.auth({ bot_id: botId, request_access: 'write' }, (user) => {
      if (user) cbRef.current(user);
    });
  };

  return (
    <>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('auth.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!scriptReady}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#54a9eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#4096d6] hover:shadow-md disabled:opacity-60"
        aria-label={t('auth.loginWithTelegram')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M21.94 4.6 18.7 19.86c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.29c-.26.26-.49.49-1 .49l.36-5.08 9.24-8.35c.4-.36-.09-.56-.62-.2L6.34 13.07l-4.92-1.54c-1.07-.34-1.09-1.07.22-1.59l19.24-7.42c.89-.33 1.67.2 1.38 1.68z" />
        </svg>
        {t('auth.loginWithTelegram')}
      </button>
    </>
  );
}
