-- 20260713000000_telegram_pending_state.sql
alter table public.telegram_links add column if not exists pending jsonb;

-- 20260713000001_telegram_links_rls_fix.sql
alter table public.telegram_bot_logs enable row level security;

-- 20260713000002_idempotency_and_tx_effect_rpc.sql
alter table public.telegram_bot_logs add column if not exists update_id bigint;
create unique index if not exists telegram_bot_logs_update_id_key
  on public.telegram_bot_logs (update_id)
  where update_id is not null;

create or replace function public.apply_tx_effect(
  p_entry_id uuid,
  p_type text,
  p_amount numeric,
  p_quantity numeric,
  p_direction int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry portfolio_entries%rowtype;
  v_new_qty numeric;
  v_new_avg numeric;
  v_is_buy boolean := p_type in ('investing','saving','expense');
  v_is_sell boolean := p_type = 'sell';
begin
  if p_entry_id is null or coalesce(p_quantity, 0) <= 0
     or p_direction not in (1, -1) or not (v_is_buy or v_is_sell) then
    return jsonb_build_object('applied', false);
  end if;

  select * into v_entry from portfolio_entries where id = p_entry_id for update;
  if not found then
    return jsonb_build_object('applied', false, 'error', 'Portfolio entry not found');
  end if;

  if auth.uid() is not null and v_entry.user_id <> auth.uid() then
    return jsonb_build_object('applied', false, 'error', 'Not your portfolio entry');
  end if;

  if v_is_buy then
    v_new_qty := v_entry.quantity + p_direction * p_quantity;
    if v_new_qty > 0 then
      v_new_avg := ceil((v_entry.quantity * v_entry.purchase_price
                         + p_direction * p_amount) / v_new_qty);
    else
      v_new_avg := v_entry.purchase_price;
    end if;
  else
    if p_direction = 1 and p_quantity > v_entry.quantity then
      return jsonb_build_object('applied', false, 'error',
        format('Insufficient quantity. You only have %s units.', v_entry.quantity));
    end if;
    v_new_qty := v_entry.quantity - p_direction * p_quantity;
    v_new_avg := v_entry.purchase_price;
  end if;

  update portfolio_entries
     set quantity = v_new_qty,
         purchase_price = v_new_avg,
         updated_at = now()
   where id = p_entry_id;

  return jsonb_build_object('applied', true,
    'quantity', v_new_qty, 'purchase_price', v_new_avg);
end
$$;

revoke all on function public.apply_tx_effect(uuid, text, numeric, numeric, int) from public;
grant execute on function public.apply_tx_effect(uuid, text, numeric, numeric, int)
  to authenticated, service_role;

-- 20260713000003_reclassify_etf_fund.sql
update public.portfolio_entries
   set type = 'Fund', updated_at = now()
 where type = 'ETF'
   and upper(split_part(trim(name), ' ', 1)) not in ('E1VFVN30', 'FUEVFVND', 'FUETCC50');

update public.portfolio_entries
   set type = 'ETF', updated_at = now()
 where upper(split_part(trim(name), ' ', 1)) in ('E1VFVN30', 'FUEVFVND', 'FUETCC50')
   and type <> 'ETF';

notify pgrst, 'reload schema';