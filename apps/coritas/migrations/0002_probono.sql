-- Pro bono ("Giving Back") intake path. Adds a lightweight source tag plus two
-- pro-bono-specific capture fields so these requests are easy to spot and triage
-- in Kate's admin inbox. Existing rows get NULLs (treated as ordinary inquiries).

ALTER TABLE leads ADD COLUMN source    TEXT;  -- e.g. 'giving-back' for the Pro bono CTA
ALTER TABLE leads ADD COLUMN org_type  TEXT;  -- 'nonprofit' | 'small_business' (pro bono)
ALTER TABLE leads ADD COLUMN mission   TEXT;  -- pro bono: mission / what the org does

CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
