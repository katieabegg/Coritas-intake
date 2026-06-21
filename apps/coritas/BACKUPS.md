# Lead pipeline backups (3-2-1)

Off-site, automated backups of the lead data, with no manual steps.

## What gets backed up

The `leads` and `lead_events` tables from the shared `coritas_blog` D1. (The
blog's own tables — `messages` / `clients` / `sessions` / `posts` — are not part
of this project and are not exported here.)

## How it works

```
D1 (coritas_blog)
  └─ daily cron → scheduled() in src/index.ts → src/backup.ts
       └─ writes  leads/YYYY-MM-DD.json  to R2 bucket  coritas-backups   ← off-site cloud copy
            └─ TrueNAS Cloud Sync (Pull) → local dataset                  ← local copy
```

Three copies of the data: live in D1, in R2, and on the NAS — that's "3-2-1".
On top of this, D1's built-in **Time Travel** already gives 30-day
point-in-time restore automatically; these snapshots add an off-platform and
longer-lived archive.

- **Schedule:** daily at 09:10 UTC (`triggers.crons` in `wrangler.jsonc`).
- **No API token:** the Worker reads D1 through its existing `DB` binding, so
  there's no Cloudflare API token or extra secret to manage.
- **Retention:** the job prunes snapshots older than **90 days** itself
  (`RETENTION_DAYS` in `src/backup.ts`), so R2 storage can't creep upward.
- **One file per day:** key is `leads/YYYY-MM-DD.json`; a same-day re-run
  overwrites rather than duplicating.

## Snapshot format

A single JSON object per day:

```jsonc
{
  "schema_version": 1,
  "exported_at": "2026-06-21T09:10:00.000Z",
  "database": "coritas_blog",
  "counts": { "leads": 42, "lead_events": 137 },
  "tables": {
    "leads": [ { /* full row, all columns */ } ],
    "lead_events": [ { /* full row */ } ]
  }
}
```

`SELECT *` is used on purpose, so new columns added by future migrations are
captured automatically — no edits to `backup.ts` needed.

## Restoring

A restore is a manual, deliberate action (it should be rare):

1. Download the snapshot you want, either from the R2 bucket (Cloudflare
   dashboard → R2 → `coritas-backups`) or from the NAS copy.
2. For each table, turn the row objects back into `INSERT` statements and apply
   them with `wrangler d1 execute coritas_blog --remote --file=restore.sql`
   (or `--command`). Because the snapshot is plain JSON, a few lines of script
   can generate the SQL.
3. Restore into a throwaway/staging database first to verify before touching
   production.

## The local (NAS) copy — one-time TrueNAS setup

The cloud half (D1 → R2) runs on its own. To add the local copy, create a
**Cloud Sync Task** in TrueNAS pointing at the R2 bucket. Both TrueNAS editions
support this; the exact menu labels below are for **SCALE** and differ somewhat
on **CORE**, so confirm which edition the NAS is running first.

1. Generate an **R2 API token** (S3 access key + secret) scoped to read
   `coritas-backups` (Cloudflare dashboard → R2 → Manage R2 API Tokens).
2. Add an **S3-compatible cloud credential** (SCALE: Credentials → Backup
   Credentials → Cloud Credentials → Add): endpoint = your R2 S3 endpoint
   (`https://<account-id>.r2.cloudflarestorage.com`), paste the access key +
   secret.
3. Add a **Cloud Sync Task** (SCALE: Data Protection → Cloud Sync Tasks → Add):
   direction **Pull**, the credential above, bucket `coritas-backups`, a local
   dataset as the target, on a daily schedule (a little after 09:10 UTC).

The NAS only ever needs the read-only R2 key — never a Cloudflare API token.
