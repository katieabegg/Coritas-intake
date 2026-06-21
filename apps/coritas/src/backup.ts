// Off-platform backup of the lead pipeline.
//
// This project owns only the `leads` and `lead_events` tables in the shared
// coritas_blog D1 (the blog's messages/clients/sessions/posts are not ours to
// export). The daily cron handler reads both tables straight through the
// existing DB binding — no Cloudflare API token needed — and writes a single
// JSON snapshot per day to the `coritas-backups` R2 bucket. R2 is the off-site
// cloud copy; a TrueNAS Cloud Sync task later pulls the same bucket down to
// local disk, giving a 3-2-1 backup (live D1 + R2 + NAS).
//
// `SELECT *` is intentional so new columns (migrations) are captured without
// touching this file. Restore is documented in apps/coritas/BACKUPS.md.

import type { Env } from "./env.js";

const PREFIX = "leads/";
const RETENTION_DAYS = 90;
const TABLES = ["leads", "lead_events"] as const;

export interface BackupResult {
  key: string;
  counts: Record<string, number>;
  pruned: number;
}

/** Export the owned tables to a dated JSON object in R2, then prune old ones. */
export async function runBackup(env: Env): Promise<BackupResult> {
  const now = new Date();
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    // Table names are a fixed allow-list above, never user input.
    const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
    tables[table] = results;
    counts[table] = results.length;
  }

  const snapshot = {
    schema_version: 1,
    exported_at: now.toISOString(),
    database: "coritas_blog",
    tables,
    counts,
  };

  // One file per day; a same-day re-run overwrites rather than duplicating.
  const key = `${PREFIX}${now.toISOString().slice(0, 10)}.json`;
  await env.BACKUPS.put(key, JSON.stringify(snapshot, null, 2), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      exportedAt: snapshot.exported_at,
      leads: String(counts.leads ?? 0),
      leadEvents: String(counts.lead_events ?? 0),
    },
  });

  const pruned = await pruneOldBackups(env, now);
  return { key, counts, pruned };
}

/** Delete snapshots older than the retention window so storage can't creep up. */
async function pruneOldBackups(env: Env, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const stale: string[] = [];

  let cursor: string | undefined;
  do {
    const page = await env.BACKUPS.list({ prefix: PREFIX, cursor });
    for (const obj of page.objects) {
      if (obj.uploaded < cutoff) stale.push(obj.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  if (stale.length > 0) await env.BACKUPS.delete(stale);
  return stale.length;
}
