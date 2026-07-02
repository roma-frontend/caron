import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { orderConfirmationEmail } from './lib/emailTemplates';

/**
 * Send the branded order-confirmation email. Scheduled from orders.create, so it
 * runs server-side in a trusted context (no public endpoint, no spoofable
 * recipient). Best-effort: silently no-ops when RESEND_API_KEY isn't set or the
 * customer has no real email (Telegram placeholder).
 *
 * Requires RESEND_API_KEY in the Convex deployment env (dev + prod) and a
 * verified `caron.group` domain in Resend for delivery from noreply@caron.group.
 */
export const sendOrderConfirmation = internalAction({
  args: {
    to: v.string(),
    orderNumber: v.string(),
    customerName: v.optional(v.string()),
    items: v.array(v.object({ name: v.string(), price: v.number(), quantity: v.number() })),
    subtotal: v.number(),
    shipping: v.number(),
    total: v.number(),
    shippingAddress: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (process.env.NOTIFICATIONS_DISABLED === '1') return;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // email not configured — skip silently
    if (!args.to || args.to.endsWith('@telegram.local')) return;

    const { subject, html } = orderConfirmationEmail({
      to: args.to,
      orderNumber: args.orderNumber,
      customerName: args.customerName,
      items: args.items,
      subtotal: args.subtotal,
      shipping: args.shipping,
      total: args.total,
      shippingAddress: args.shippingAddress,
    });

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: (process.env.EMAIL_FROM || 'Caron <noreply@caron.group>').trim(), to: args.to, subject, html }),
      });
    } catch {
      /* best-effort: never block order flow on email failure */
    }
  },
});
