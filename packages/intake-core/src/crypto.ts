// Constant-time string comparison for secrets (admin tokens, signatures).
// HMACs both inputs under the same ephemeral random key and compares the
// fixed-length 32-byte digests, so timing is independent of input contents
// AND length. Uses Web Crypto (crypto.subtle), available in Workers.

/** True iff `a` and `b` are equal, without leaking length/content via timing. */
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  // Digests are always 32 bytes; XOR-accumulate the difference.
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}
