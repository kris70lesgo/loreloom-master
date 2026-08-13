-- Heritage Research Cache — stores Tavily research results keyed by subject
CREATE TABLE IF NOT EXISTS heritage_research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  subject_hash TEXT NOT NULL UNIQUE,
  evidence JSONB NOT NULL,
  claim_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_heritage_research_subject_hash ON heritage_research_cache(subject_hash);
CREATE INDEX IF NOT EXISTS idx_heritage_research_created_at ON heritage_research_cache(created_at DESC);

ALTER TABLE heritage_research_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read heritage research" ON heritage_research_cache FOR SELECT USING (true);
CREATE POLICY "Service role can write heritage research" ON heritage_research_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update heritage research" ON heritage_research_cache FOR UPDATE USING (true);

ALTER TABLE heritage_research_cache REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'heritage_research_cache'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.heritage_research_cache;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_heritage_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_heritage_research_updated_at ON heritage_research_cache;
CREATE TRIGGER trg_heritage_research_updated_at
  BEFORE UPDATE ON heritage_research_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_heritage_research_updated_at();
