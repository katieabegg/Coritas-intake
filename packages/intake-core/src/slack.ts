// Slack incoming-webhook notification. Best-effort; never throws.
// https://api.slack.com/messaging/webhooks

export async function notifySlack(
  webhookUrl: string,
  text: string,
  blocks?: unknown[],
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blocks ? { text, blocks } : { text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
