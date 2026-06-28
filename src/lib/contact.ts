/**
 * Helpers for the internal placeholder email assigned to Telegram-only accounts
 * (`tg_<id>@telegram.local`). Such accounts have no real email — the placeholder
 * exists only to satisfy the unique-email constraint and must never be shown to
 * users or admins (use the Telegram @username instead, where available).
 */
export function isPlaceholderEmail(email?: string | null): boolean {
  return !!email && email.endsWith('@telegram.local');
}

/** Email safe to display: the real address, or '' for the Telegram placeholder. */
export function displayEmail(email?: string | null): string {
  return !email || isPlaceholderEmail(email) ? '' : email;
}
