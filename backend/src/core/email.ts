const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const RESEND_FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn('[email] RESEND_API_KEY not set — email not sent'); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) console.warn('[email] send failed', res.status, await res.text());
    return res.ok;
  } catch (e) { console.warn('[email] error', String(e)); return false; }
}

export function resetEmailHtml(link: string, role: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h2 style="color:#111">Reset your password</h2>
    <p style="color:#444;font-size:15px;line-height:1.6">We received a request to reset the password for your <b>${role}</b> account. Click the button below to choose a new one. This link expires in 1 hour.</p>
    <p style="margin:26px 0"><a href="${link}" style="background:#14B86A;color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:600;display:inline-block">Reset password</a></p>
    <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    <p style="color:#aaa;font-size:12px;word-break:break-all">Or paste this link: ${link}</p>
  </div>`;
}
