// Cloudflare Turnstile server-side verification.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  errorCodes: string[];
}

/**
 * Verify a Turnstile token against Cloudflare. Returns success=false (never
 * throws) so callers can decide how to respond.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  secretKey: string,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  if (!token) return { success: false, errorCodes: ["missing-input-response"] };

  const body = new FormData();
  body.append("secret", secretKey);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    return {
      success: Boolean(data.success),
      errorCodes: data["error-codes"] ?? [],
    };
  } catch (err) {
    return { success: false, errorCodes: ["internal-error"] };
  }
}
