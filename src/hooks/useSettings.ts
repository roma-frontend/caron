'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useSettings() {
  return useQuery(api.settings.getPublic, {});
}
