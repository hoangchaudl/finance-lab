ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

NOTIFY pgrst, 'reload schema';
