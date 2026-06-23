/**
 * Branded, email-client-safe HTML templates for Caron.
 *
 * Email clients (Gmail, Outlook, Apple Mail) strip <style>/classes and have
 * patchy CSS support, so everything here uses table-based layout + inline
 * styles, a 600px centered card, web-safe fonts, and bulletproof buttons.
 */

const BRAND = {
  name: 'CARON',
  primary: '#0066AE',
  primaryDark: '#0b5ed7',
  text: '#1f2937',
  muted: '#6b7280',
  bg: '#f4f5f6',
  card: '#ffffff',
  border: '#e5e7eb',
  site: 'https://caron.am',
  email: 'info@caron.am',
};

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Shared shell: branded header, content slot, footer. `preheader` is the hidden
 * preview line shown in the inbox list.
 */
function baseEmailLayout(opts: { title: string; preheader?: string; content: string }): string {
  const { title, preheader = '', content } = opts;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="hy">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});padding:28px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:26px;font-weight:800;letter-spacing:3px;color:#ffffff;">${BRAND.name}<span style="font-size:11px;font-weight:600;letter-spacing:2px;opacity:0.8;display:block;margin-top:2px;">GROUP</span></td>
                <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;">Ավտոպահեստամասեր</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:32px;color:${BRAND.text};font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#fafafa;border-top:1px solid ${BRAND.border};padding:24px 32px;color:${BRAND.muted};font-size:12px;line-height:1.6;">
            <p style="margin:0 0 6px;">Caron — Հայաստանի ավտոպահեստամասերի առցանց խանութ</p>
            <p style="margin:0 0 6px;">
              <a href="${BRAND.site}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.site.replace('https://', '')}</a>
              &nbsp;•&nbsp;
              <a href="mailto:${BRAND.email}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.email}</a>
            </p>
            <p style="margin:8px 0 0;color:#9ca3af;">© ${year} Caron. Բոլոր իրավունքները պաշտպանված են։</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
        <tr><td style="padding:16px 32px;text-align:center;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;">
          Այս նամակը ուղարկվել է ${BRAND.site.replace('https://', '')}-ի կողմից։
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Bulletproof, table-based CTA button. */
function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
    <tr><td style="border-radius:10px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

export type InvoiceEmailInput = {
  to: string;
  orderNumber: string;
  total: string;
  bankName?: string;
  bankAccount?: string;
  customerName?: string;
};

/** Bank-transfer invoice email. Returns subject + branded HTML. */
export function invoiceEmail(input: InvoiceEmailInput): { subject: string; html: string } {
  const orderNumber = escapeHtml(input.orderNumber);
  const total = escapeHtml(input.total);
  const bankName = escapeHtml(input.bankName ?? '');
  const bankAccount = escapeHtml(input.bankAccount ?? '');
  const greetingName = input.customerName ? escapeHtml(input.customerName) : '';

  const bankBlock = (bankName || bankAccount)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border:1px dashed ${BRAND.border};border-radius:12px;background-color:#f9fafb;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};">Բանկային փոխանցման տվյալներ</p>
          ${bankName ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr><td style="color:${BRAND.muted};font-size:14px;">Բանկ</td><td align="right" style="font-weight:600;font-size:14px;">${bankName}</td></tr></table>` : ''}
          ${bankAccount ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="color:${BRAND.muted};font-size:14px;">Հաշվեհամար</td><td align="right" style="font-family:'Courier New',monospace;font-weight:700;font-size:15px;color:${BRAND.text};letter-spacing:0.5px;">${bankAccount}</td></tr></table>` : ''}
        </td></tr>
      </table>`
    : '';

  const content = `
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${BRAND.text};">
      ${greetingName ? `Հարգելի ${greetingName}, շ` : 'Շ'}նորհակալություն Ձեր պատվերի համար։
    </p>
    <p style="margin:0 0 20px;color:${BRAND.muted};">
      Ձեր պատվերը գրանցված է։ Ստորև՝ վճարման մանրամասները։
    </p>

    <!-- Order number pill -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background-color:${BRAND.primary}14;border:1px solid ${BRAND.primary}33;border-radius:999px;padding:8px 16px;color:${BRAND.primary};font-weight:700;font-size:14px;">
        Պատվեր №${orderNumber}
      </td></tr>
    </table>

    <!-- Total -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid ${BRAND.border};border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;color:${BRAND.muted};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Վճարման ենթակա գումար</p>
        <p style="margin:0;font-size:30px;font-weight:800;color:${BRAND.text};">${total} <span style="font-size:20px;color:${BRAND.primary};">֏</span></p>
      </td></tr>
    </table>

    ${bankBlock}

    ${button('Հետևել պատվերին', `${BRAND.site}/order-status`)}

    <p style="margin:20px 0 0;color:${BRAND.muted};font-size:13px;">
      Հարցերի դեպքում պատասխանեք այս նամակին կամ գրեք
      <a href="mailto:${BRAND.email}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.email}</a>։
    </p>
  `;

  return {
    subject: `Caron — Պատվեր №${input.orderNumber} · վճարման մանրամասներ`,
    html: baseEmailLayout({
      title: `Պատվեր №${input.orderNumber}`,
      preheader: `Վճարման ենթակա գումար՝ ${input.total} ֏`,
      content,
    }),
  };
}
