import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TX_TYPES = ["income", "expense", "investing", "saving", "sell", "dividend"] as const;
type TxType = typeof TX_TYPES[number];

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

  let body: { type?: string; amount?: number; category_name?: string; note?: string; quality?: string; date?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 }); }

  const { type, amount, category_name, note, quality } = body;
  if (!type || !TX_TYPES.includes(type as TxType)) {
    return new Response(JSON.stringify({ error: `type must be one of: ${TX_TYPES.join(", ")}` }), { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return new Response(JSON.stringify({ error: "amount must be a positive number" }), { status: 400 });
  }

  const txType = type as TxType;
  const date = body.date ?? new Date().toISOString().slice(0, 10);
  const categoryTargetType = CATEGORY_TYPE_MAP[txType];
  let categoryId: string | null = null;

  if (category_name) {
    const { data: existing } = await supabase.from("categories").select("id")
      .eq("user_id", userId).ilike("name", category_name).maybeSingle();
    if (existing) categoryId = existing.id;
  }

  if (!categoryId) {
    const fallbackName = category_name ?? "Uncategorized";
    const { data: fallback } = await supabase.from("categories").select("id")
      .eq("user_id", userId).eq("name", fallbackName).eq("type", categoryTargetType).maybeSingle();

    if (fallback) {
      categoryId = fallback.id;
    } else {
      const { data: created, error: createErr } = await supabase.from("categories")
        .insert({ user_id: userId, name: fallbackName, type: categoryTargetType, emoji: "🤖" })
        .select("id").single();
      if (createErr) return new Response(JSON.stringify({ error: `category resolution failed: ${createErr.message}` }), { status: 500 });
      categoryId = created.id;
    }
  }

  const insertPayload: Record<string, unknown> = {
    user_id: userId, date, amount, type: txType, category_id: categoryId, note: note ?? null,
  };
  if (txType === "income" && !quality) insertPayload.quality = "active";
  else if (quality) insertPayload.quality = quality;

  const { error: insertErr } = await supabase.from("transactions").insert(insertPayload);
  if (insertErr) return new Response(JSON.stringify({ error: `insert failed: ${insertErr.message}` }), { status: 500 });

  supabase.from("agent_api_tokens").update({ last_used_at: new Date().toISOString() }).eq("token_hash", tokenHash).then(() => {});

  const formatted = amount.toLocaleString("de-DE");
  return new Response(JSON.stringify({
    ok: true,
    reply_text: `✅ Logged: ${formatted} VND · ${category_name ?? "Uncategorized"} · ${txType}`,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
