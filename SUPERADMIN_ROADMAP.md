# Caron — Superadmin & Smart Admin Roadmap

Rolling plan for the owner control center and smart admin tooling. Modeled on
the `hr-project` RBAC/superadmin patterns.

## Role model

`superadmin` (owner) → `admin` → `manager` → `customer`

- Source of truth: `users.role`.
- Bootstrap superadmin:
  - **Email:** `ADMIN_EMAIL` env (env-admin login auto-promotes to `superadmin`).
  - **Telegram:** env `SUPERADMIN_TELEGRAM` (comma-separated usernames, no `@`).
    Defaults to `i_amVip`. On Telegram login that handle is promoted to
    `superadmin`.
- Helpers in `convex/lib/auth.ts`: `isSuperadmin`, `isSuperadminTelegram`,
  `getAdminCaller` (superadmin|admin|manager), `getSuperAdminCaller` (owner only),
  `logAudit`, `ROLE_HIERARCHY`.

## Done

### Phase 1 — control backbone ✅ (shipped)
- `superadmin` role + bootstrap (email + Telegram `@i_amVip`).
- Audit log: `auditLogs` table + `logAudit`, wired into user create/update/delete,
  role change, password reset, access-matrix changes, product delete/restore/purge.
- Access-control matrix: `accessControl` table; superadmin toggles admin-panel
  sections/actions per `admin`/`manager`. Default = all enabled (unchanged
  behaviour). Enforcement: nav hidden + route guard (`/admin/layout.tsx` via
  `access.getMyCapabilities`).
- `/admin/control` dashboard (superadmin-only): KPIs, access matrix (switches),
  staff overview, live audit feed.
- Backend: `convex/access.ts` (`getAccessMatrix`, `setCapability`,
  `getMyCapabilities`, `listAudit`, `getControlStats`, `listStaff`).

### Phase 2A — needs-attention inbox + abandoned carts ✅ (shipped)
- `convex/insights.ts`: `getInbox`, `getAbandonedCarts`.
- `/admin/inbox`: queue cards (orders/payment/returns/reviews/Q&A/zero-stock),
  abandoned-cart recovery list with Telegram/phone/email quick contact, previews.

### Phase 2B — product trash (soft delete) ✅ (shipped)
- `deletedProducts` archive table; delete → archive (images kept in R2, included
  in `imageReferences` so orphan cron won't purge them).
- `/admin/trash`: restore / delete-forever / empty; daily cron purges > 30 days.
- Backend in `convex/products.ts`: `listTrash`, `restoreProduct`,
  `permanentDeleteProduct`, `emptyTrash`, `purgeOldTrash` (+ `crons.ts`).

## Next (not yet built)

### Phase 2C — bulk order actions
- Selection mode in `/admin/orders`: bulk status change + export/print selected.
- `orders.bulkAction` mutation (audit-logged).

### Phase 3 — smart analytics
- Sales velocity + reorder suggestions on `/admin/stock`.
- Dead-stock report.
- Customer LTV / order count / last order on the customer card + `customers.list`.

### Phase 4 — control/security+
- Impersonation ("view as customer", read-only) — `impersonationSessions` table.
- Daily Telegram digest (revenue, orders, low-stock) via cron + notifications.
- Extend audit to all sections (products/orders/settings writes).
- Enforce capabilities at the mutation level (not only routes): a
  `requireCapability(ctx, token, cap)` gate wrapping section mutations.
- Trash for orders/categories (reuse archive pattern).

## Conventions
- Verify each slice: `npx convex codegen` → `npx tsc --noEmit` → `npx eslint <files>`.
- Ship per slice: commit + `git push`, then `npx vercel deploy --prod --yes`
  (GitHub auto-deploy webhook is flaky — manual CLI deploy is reliable).
- i18n lives in `src/lib/i18n/dict/*` (control/inbox/trash keys in `adminControl.ts`).
</content>
</invoke>
