// Resend transactional email. https://resend.com/docs/api-reference/emails/send-email
const RESEND_URL = "https://api.resend.com/emails";

export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
}

export interface EmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(
  apiKey: string,
  msg: EmailMessage,
): Promise<EmailResult> {
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(msg),
    });
    if (!res.ok) {
      return { ok: false, error: `resend ${res.status}: ${await res.text()}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
