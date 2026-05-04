ALTER TABLE public.portfolio_entries
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'Growth';
