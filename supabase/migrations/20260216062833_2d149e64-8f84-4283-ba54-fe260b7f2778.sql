-- Add realized_gain column to transactions table for tracking sell profits
ALTER TABLE public.transactions ADD COLUMN realized_gain numeric DEFAULT NULL;