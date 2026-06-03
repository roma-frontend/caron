'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';

type PublicSettings = Omit<Doc<'settings'>, 'telegramBotToken' | 'telegramChatId'> | null | undefined;

const STORAGE_KEY = 'public_settings_cache';

const SettingsContext = createContext<PublicSettings>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const live = useQuery(api.settings.getPublic, {});
  // Restored from localStorage after mount so repeat visits apply settings
  // instantly (no network wait) without causing a hydration mismatch.
  const [cached, setCached] = useState<PublicSettings>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCached(JSON.parse(raw) as PublicSettings);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (live !== undefined) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(live));
      } catch {
        /* ignore */
      }
    }
  }, [live]);

  // Prefer live data; fall back to cached value while the query is loading.
  const value = live !== undefined ? live : cached;

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): PublicSettings {
  return useContext(SettingsContext);
}
