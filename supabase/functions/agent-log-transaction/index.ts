import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TX_TYPES = ["income", "expense", "investing", "saving", "sell", "dividend"] as const;
type TxType = typeof TX_TYPES[number];
const PORTFOLIO_LINKED_TYPES: TxType[] = ["investing", "dividend"];

const CATEGORY_TYPE_MAP: Record<TxType, string> = {
  income: "income",
  dividend: "income",
  expense: "nonessential",
  investing: "investment",
  sell: "investment",
  saving: "savings",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveCategoryId(supabase: any, userId: string, txType: TxType, categoryName?: string) {
  const categoryTargetType = CATEGORY_TYPE_MAP[txType];
  if (categoryName) {
    const { data: existing } = await supabase.from("categories").select("id")
      .eq("user_id", userId).ilike("name", categoryName).maybeSingle();
    if (existing) return existing.id;
  }
  const fallbackName = categoryName ?? "Uncategorized";
  const { data: fallback } = await supabase.from("categories").select("id")
    .eq("user_id", userId).eq("name", fallbackName).eq("type", categoryTargetType).maybeSingle();
  if (fallback) return fallback.id;

  const { data: created, error } = await supabase.from("categories")
    .insert({ user_id: userId, name: fallbackName, type: categoryTargetType, emoji: "🤖" })
    .select("id").single();
  if (error) throw new Error(`category resolution failed: ${error.message}`);
  return created.id;
}

async function resolvePortfolioEntryId(
  supabase: any,
  userId: string,
  assetName: string | undefined,
  assetType: string | undefined,
  amount: number,
  opts?: { applyBuy?: boolean; quantity?: number; tier?: string },
) {
  if (!assetName) return null;

  const { data: existing } = await supabase.from("portfolio_entries").select("id, quantity, purchase_price")
    .eq("user_id", userId).ilike("name", assetName).limit(1).maybeSingle();
  if (existing) {
    // Mirror the web app's buy logic: bump quantity and recalc avg purchase price
    if (opts?.applyBuy && opts.quantity && opts.quantity > 0) {
      const currentQty = Number(existing.quantity) || 0;
      const currentAvg = Number(existing.purchase_price) || 0;
      const newQty = currentQty + opts.quantity;
      const newAvg = newQty > 0 ? Math.ceil((currentQty * currentAvg + amount) / newQty) : 0;
      await supabase.from("portfolio_entries")
        .update({ quantity: newQty, purchase_price: newAvg, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const qty = opts?.quantity && opts.quantity > 0 ? opts.quantity : 1;
  const unitPrice = Math.round(amount / qty);
  const { data: created, error } = await supabase.from("portfolio_entries")
    .insert({
      user_id: userId,
      name: assetName,
      type: assetType || "Other",
      tier: opts?.tier ?? null,
      account: "Unassigned",
      quantity: qty,
      purchase_price: unitPrice,
      current_price: unitPrice,
    })
    .select("id").single();
  if (error) throw new Error(`portfolio entry creation failed: ${error.message}`);
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return new Response(JSON.stringify({ error: "missing bearer token" }), { status: 401 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const tokenHash = await sha256Hex(token);
  const { data: tokenRow, error: tokenErr } = await supabase
    .from("agent_api_tokens").select("user_id, is_active").eq("token_hash", tokenHash).maybeSingle();

  if (tokenErr || !tokenRow || !tokenRow.is_active) {
    return new Response(JSON.stringify({ error: "invalid or inactive token" }), { status: 401 });
  }
  const userId = tokenRow.user_id;

  let body: {
    type?: string; amount?: number; category_name?: string;
    asset_name?: string; asset_type?: string; asset_tier?: string; note?: string; quality?: string; date?: string;
    quantity?: number;
  };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 }); }

  const { type, amount, category_name, asset_name, asset_type, asset_tier, note, quality, quantity } = body;
  if (!type || !TX_TYPES.includes(type as TxType)) {
    return new Response(JSON.stringify({ error: `type must be one of: ${TX_TYPES.join(", ")}` }), { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return new Response(JSON.stringify({ error: "amount must be a positive number" }), { status: 400 });
  }

  const txType = type as TxType;
  // Server runs in UTC; users are in Vietnam (UTC+7) — shift so late-night
  // logs land on the correct local date
  const date = body.date ?? new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  let categoryId: string | null = null;
  let portfolioEntryId: string | null = null;

  try {
    if (PORTFOLIO_LINKED_TYPES.includes(txType)) {
      portfolioEntryId = await resolvePortfolioEntryId(supabase, userId, asset_name, asset_type, amount, {
        applyBuy: txType === "investing",
        quantity,
        tier: asset_tier,
      });
    } else {
      categoryId = await resolveCategoryId(supabase, userId, txType, category_name);
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }

  const insertPayload: Record<string, unknown> = {
    user_id: userId, date, amount, type: txType,
    category_id: categoryId,
    portfolio_entry_id: portfolioEntryId,
    note: note ?? null,
  };
  if (typeof quantity === "number" && quantity > 0) insertPayload.quantity = quantity;
  if (txType === "income" && !quality) insertPayload.quality = "active";
  else if (quality) insertPayload.quality = quality;

  const { error: insertErr } = await supabase.from("transactions").insert(insertPayload);
  if (insertErr) return new Response(JSON.stringify({ error: `insert failed: ${insertErr.message}` }), { status: 500 });

  supabase.from("agent_api_tokens").update({ last_used_at: new Date().toISOString() }).eq("token_hash", tokenHash).then(() => {});

  const label = PORTFOLIO_LINKED_TYPES.includes(txType) ? (asset_name ?? "Unknown asset") : (category_name ?? "Uncategorized");
  const formatted = amount.toLocaleString("de-DE");
  return new Response(JSON.stringify({
    ok: true,
    reply_text: `✅ Logged: ${formatted} VND · ${label} · ${txType}`,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
