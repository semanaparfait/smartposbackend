// SmartPOS emails, in the brand colours. Built from tables with inline styles,
// the only layout every mail app (Gmail, Outlook, phones) shows the same way.

const INK = '#20283b'; // Ink Navy
const LIME = '#d0e66b'; // Electric Lime
const IVORY = '#f4f5ef'; // Soft Ivory
const MUTED = '#6b7385';
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Anything from a person (a name) is escaped before it goes into the HTML.
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

// The frame every SmartPOS email shares: header, white card, footer.
export function layout({
  preheader,
  body,
}: {
  preheader: string;
  body: string;
}) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>SmartPOS</title>
</head>
<body style="margin:0;padding:0;background:${IVORY};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${IVORY};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${IVORY};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td style="background:${INK};border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:34px;height:34px;background:${LIME};border-radius:9px;text-align:center;vertical-align:middle;font-family:${FONT};font-size:18px;font-weight:700;color:${INK};">&#10003;</td>
                <td style="padding-left:12px;font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;">SmartPOS</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px 28px 28px;font-family:${FONT};color:${INK};">
            ${body}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 12px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">
            SmartPOS · Point of sale for Rwandan businesses<br>
            This email was sent automatically. Please don't reply to it.<br>
            © ${year} SmartPOS
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// The forgot-password email: the 6-digit code, big and easy to copy.
export function passwordCodeEmail(name: string, code: string, minutes: number) {
  const who = escapeHtml(name.split(' ')[0] || name);
  const html = layout({
    preheader: `Your SmartPOS code is ${code}. It works for ${minutes} minutes.`,
    body: `
<p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};">Password reset</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:30px;font-weight:700;color:${INK};">Hello ${who},</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:#3d4559;">
  Use this code to choose a new password for your SmartPOS account.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="background:${LIME};border-radius:14px;padding:22px 12px;">
      <div style="font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${INK};opacity:0.7;">Your code</div>
      <div style="margin-top:6px;font-family:'Courier New',Consolas,monospace;font-size:38px;line-height:44px;font-weight:700;letter-spacing:8px;color:${INK};">${code}</div>
    </td>
  </tr>
</table>
<p style="margin:16px 0 0;font-size:13px;line-height:20px;color:${MUTED};text-align:center;">
  It works for <strong style="color:${INK};">${minutes} minutes</strong>. Type it on the SmartPOS page where you asked for it.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
  <tr>
    <td style="background:${IVORY};border-left:4px solid ${INK};border-radius:8px;padding:14px 16px;font-size:13px;line-height:20px;color:#3d4559;">
      <strong style="color:${INK};">Didn't ask for this?</strong> Ignore this email. Your password stays the same, and nobody can use the code without your email.
    </td>
  </tr>
</table>
<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${MUTED};">
  For your safety, SmartPOS will never ask you for this code by phone or message.
</p>`,
  });

  const text = `Hello ${name},

Your code to set a new SmartPOS password is: ${code}

It works for ${minutes} minutes. Type it on the SmartPOS page where you asked for it.

Didn't ask for this? Ignore this email. Your password stays the same.

SmartPOS will never ask you for this code by phone or message.`;

  return { html, text };
}
