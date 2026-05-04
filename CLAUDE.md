# Finance Lab — Claude Code Context

## Stack
- React + TypeScript + Vite
- Supabase (auth + database)
- Tailwind CSS + shadcn/ui
- Recharts for charts
- lucide-react for icons
- react-router-dom for routing

## Key files
- src/hooks/use-app-data.ts — all data fetching and mutations
- src/lib/types.ts — all TypeScript types
- src/contexts/AppContext.tsx — global state
- src/pages/ — all page components
- src/components/ — reusable components

## Database
- Dev Supabase: cqqqbxvjmihzoqusuebk (local .env.local)
- Prod Supabase: separate project (Lovable env vars)
- Always write migrations for both dev and prod

## Rules
- Never use Vietnamese text in UI (English only)
- Tier names: Defensive, Safe, Income, Growth, Risk
- Always use lucide-react for icons
- Always use existing shadcn/ui components
- Minimal changes only — don't refactor unrelated code
- Always add key props to .map() calls
- Wrap async calls in try/catch with toast error

## Current branch
feature/mvp-upgrade

## Transaction types
income, expense, investing, saving, sell, dividend

## Income quality types  
active, scalable, passive

## Portfolio tier types
Defensive, Safe, Income, Growth, Risk
