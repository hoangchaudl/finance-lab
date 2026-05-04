-- Add quality column for income quality classification
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS quality TEXT DEFAULT NULL;

-- Drop the old type constraint and replace with one that includes sell and dividend
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'investing', 'saving', 'sell', 'dividend'));
