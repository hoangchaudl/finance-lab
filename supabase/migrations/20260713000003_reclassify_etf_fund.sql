-- Only listed HOSE ETFs stay type 'ETF'; every other 'ETF' entry is
-- actually a mutual fund (Fmarket-priced), so reclassify to 'Fund'.
update public.portfolio_entries
   set type = 'Fund', updated_at = now()
 where type = 'ETF'
   and upper(split_part(trim(name), ' ', 1)) not in ('E1VFVN30', 'FUEVFVND', 'FUETCC50');

-- And make sure the listed ETFs are typed correctly wherever they live
update public.portfolio_entries
   set type = 'ETF', updated_at = now()
 where upper(split_part(trim(name), ' ', 1)) in ('E1VFVN30', 'FUEVFVND', 'FUETCC50')
   and type <> 'ETF';
