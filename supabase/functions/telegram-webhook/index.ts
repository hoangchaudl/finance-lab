import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const AGENT_LOG_TOKEN = Deno.env.get("AGENT_LOG_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const TIERS = ["Defensive", "Safe", "Income", "Growth", "Risk"] as const;

const HELP_TEXT =
  'Expense: amount category note\ne.g. "50k coffee cf sua"\n\nInvest: invest amount asset qty\ne.g. "invest 1tr gold 1" — or just "invest 1tr" and I\'ll ask.\n\n/cancel to abort a pending log.';

type Pending = {
  flow: "invest";
  step: "asset" | "new_name" | "create_confirm" | "tier" | "qty";
  amount: number;
  assetId?: string;
  assetName?: string;
  tier?: string;
  qty?: number;
};

// ---------- Telegram helpers ----------

async function tg(method: string, payload: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function sendMessage(chatId: number, text: string, buttons?: { text: string; data: string }[][]) {
  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (buttons) {
    payload.reply_markup = {
      inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))),
    };
  }
  await tg("sendMessage", payload);
}

const CANCEL_BTN = { text: "✖ Cancel", data: "inv|x" };

// ---------- Parsing ----------

function parseAmount(str: string): number | null {
  const tr = str.match(/^(\d+([.,]\d+)?)\s*tr$/i);
  if (tr) return Math.round(parseFloat(tr[1].replace(",", ".")) * 1_000_000);

  const k = str.match(/^(\d+([.,]\d+)?)\s*k$/i);
  if (k) return Math.round(parseFloat(k[1].replace(",", ".")) * 1_000);

  const plain = str.match(/^(\d{1,3}(?:[.,]\d{3})+|\d+)$/);
  if (plain) return parseInt(plain[1].replace(/[.,]/g, ""), 10);

  return null;
}

function parseQty(str: string): number | null {
  if (!/^\d+([.,]\d+)?$/.test(str)) return null;
  const n = parseFloat(str.replace(",", "."));
  return n > 0 ? n : null;
}

function tokenize(text: string): string[] {
  return text.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
}

function parseExpense(
  text: string,
  categoryNames: string[],
): { amount: number; categoryName: string; note: string; categoryMatched: boolean; restWords: string[] } | null {
  // Space-separated: amount category note...  e.g. "50k coffee cf sua"
  const parts = tokenize(text);
  if (parts.length === 0) return null;

  const amount = parseAmount(parts[0]);
  if (!amount) return null;

  const rest = parts.slice(1);
  const restLower = rest.map((w) => w.toLowerCase());

  // Longest match against existing categories, so multi-word names work.
  let categoryName = "";
  let consumed = 0;
  for (let len = rest.length; len >= 1; len--) {
    const candidate = restLower.slice(0, len).join(" ");
    const hit = categoryNames.find((c) => c.toLowerCase() === candidate);
    if (hit) {
      categoryName = hit;
      consumed = len;
      break;
    }
  }

  const categoryMatched = consumed > 0;
  if (!consumed) {
    categoryName = rest[0] || "Uncategorized";
    consumed = rest.length ? 1 : 0;
  }

  const note = rest.slice(consumed).join(" ") || text;
  return { amount, categoryName, note, categoryMatched, restWords: rest };
}

function parseInvest(text: string): { amount: number; assetWords: string[]; qty?: number } | null {
  const parts = tokenize(text);
  if (!/^(invest|inv)$/i.test(parts[0] ?? "")) return null;
  if (parts.length < 2) return null;

  const amount = parseAmount(parts[1]);
  if (!amount) return null;

  let rest = parts.slice(2);
  let qty: number | undefined;
  // Trailing plain number = quantity, when there's still an asset name before it
  if (rest.length >= 2) {
    const q = parseQty(rest[rest.length - 1]);
    if (q !== null) {
      qty = q;
      rest = rest.slice(0, -1);
    }
  }
  return { amount, assetWords: rest, qty };
}

function guessAssetType(name: string): string {
  const n = name.toLowerCase();
  if (/gold|vang/.test(n)) return "Gold";
  if (/btc|eth|sol|bnb|crypto|coin/.test(n)) return "Crypto";
  if (/etf/.test(n)) return "ETF";
  if (/sav|bank|deposit/.test(n)) return "Savings";
  return "Other";
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE");
}

// ---------- State ----------

async function setPending(userId: string, pending: Pending | null) {
  await supabase.from("telegram_links").update({ pending }).eq("user_id", userId);
}

async function findAsset(userId: string, name: string) {
  const { data } = await supabase
    .from("portfolio_entries")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  return data as { id: string; name: string } | null;
}

// ---------- Invest flow ----------

async function callAgentLog(body: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-log-transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${AGENT_LOG_TOKEN}` },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  return { ok: res.ok, text: result.reply_text ?? `⚠️ ${result.error ?? "Something went wrong."}` };
}

async function completeInvest(chatId: number, userId: string, p: Pending) {
  const qty = p.qty ?? 1;
  const { text } = await callAgentLog({
    type: "investing",
    amount: p.amount,
    asset_name: p.assetName,
    asset_type: guessAssetType(p.assetName ?? ""),
    asset_tier: p.tier,
    quantity: qty,
  });
  await setPending(userId, null);
  await sendMessage(chatId, `${text}\n📦 ${p.assetName} · qty ${qty}`);
}

async function askQuantity(chatId: number, userId: string, p: Pending) {
  await setPending(userId, { ...p, step: "qty" });
  await sendMessage(chatId, `How many units of "${p.assetName}"? Reply with a number.`, [
    [{ text: "1", data: "inv|q|1" }, CANCEL_BTN],
  ]);
}

async function askTier(chatId: number, userId: string, p: Pending) {
  await setPending(userId, { ...p, step: "tier" });
  await sendMessage(chatId, `Which tier for "${p.assetName}"?`, [
    TIERS.slice(0, 3).map((t) => ({ text: t, data: `inv|t|${t}` })),
    TIERS.slice(3).map((t) => ({ text: t, data: `inv|t|${t}` })),
    [CANCEL_BTN],
  ]);
}

// User gave (or picked) an asset name — route to the right next step.
async function handleAssetName(chatId: number, userId: string, p: Pending, name: string) {
  const existing = await findAsset(userId, name);
  if (existing) {
    const next: Pending = { ...p, assetId: existing.id, assetName: existing.name };
    if (next.qty) return completeInvest(chatId, userId, next);
    return askQuantity(chatId, userId, next);
  }
  await setPending(userId, { ...p, step: "create_confirm", assetName: name });
  await sendMessage(chatId, `Asset "${name}" not found in your portfolio. Create it?`, [
    [{ text: "✅ Create", data: "inv|c|y" }, CANCEL_BTN],
  ]);
}

async function startInvest(chatId: number, userId: string, amount: number, assetWords: string[], qty?: number) {
  const p: Pending = { flow: "invest", step: "asset", amount, qty };

  if (assetWords.length > 0) {
    return handleAssetName(chatId, userId, p, assetWords.join(" "));
  }

  const { data: assets } = await supabase
    .from("portfolio_entries")
    .select("id, name")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(8);

  await setPending(userId, p);
  const rows: { text: string; data: string }[][] = [];
  for (let i = 0; i < (assets ?? []).length; i += 2) {
    rows.push(assets!.slice(i, i + 2).map((a: { id: string; name: string }) => ({ text: a.name, data: `inv|a|${a.id}` })));
  }
  rows.push([{ text: "➕ New asset", data: "inv|new" }, CANCEL_BTN]);
  await sendMessage(chatId, `Investing ${fmt(amount)} VND — which asset?`, rows);
}

// ---------- Callback (button) handling ----------

async function handleCallback(cb: any) {
  const chatId = cb.message?.chat?.id as number | undefined;
  const data = (cb.data ?? "") as string;
  await tg("answerCallbackQuery", { callback_query_id: cb.id });
  if (!chatId) return;

  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id, pending")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (!link) return;

  const p = link.pending as Pending | null;

  if (data === "inv|x") {
    await setPending(link.user_id, null);
    await sendMessage(chatId, "Cancelled.");
    return;
  }
  if (!p || p.flow !== "invest") {
    await sendMessage(chatId, "That action expired. Start again with: invest amount asset");
    return;
  }

  const [, action, value] = data.split("|");

  if (action === "a" && value) {
    const { data: asset } = await supabase
      .from("portfolio_entries").select("id, name").eq("id", value).eq("user_id", link.user_id).maybeSingle();
    if (!asset) return sendMessage(chatId, "Asset not found. /cancel and try again.");
    const next: Pending = { ...p, assetId: asset.id, assetName: asset.name };
    if (next.qty) return completeInvest(chatId, link.user_id, next);
    return askQuantity(chatId, link.user_id, next);
  }

  if (action === "new") {
    await setPending(link.user_id, { ...p, step: "new_name" });
    return sendMessage(chatId, "Send the new asset's name:");
  }

  if (action === "c" && value === "y") {
    return askTier(chatId, link.user_id, p);
  }

  if (action === "t" && value && (TIERS as readonly string[]).includes(value)) {
    const next: Pending = { ...p, tier: value };
    if (next.qty) return completeInvest(chatId, link.user_id, next);
    return askQuantity(chatId, link.user_id, next);
  }

  if (action === "q" && value) {
    const qty = parseQty(value);
    if (qty) return completeInvest(chatId, link.user_id, { ...p, qty });
  }
}

// ---------- Main ----------

Deno.serve(async (req) => {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const update = await req.json();

  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return new Response("ok");
  }

  const message = update.message;
  if (!message?.text) return new Response("ok");

  const chatId = message.chat.id as number;
  const text = (message.text as string).trim();

  const { data: logRow } = await supabase
    .from("telegram_bot_logs")
    .insert({ telegram_chat_id: chatId, raw_text: text })
    .select()
    .single();

  if (text.startsWith("/link")) {
    const code = text.replace("/link", "").trim();
    const { data: link, error } = await supabase
      .from("telegram_links")
      .update({ telegram_chat_id: chatId, link_code: null, linked_at: new Date().toISOString() })
      .eq("link_code", code)
      .is("telegram_chat_id", null)
      .select()
      .single();

    if (error || !link) {
      await sendMessage(chatId, "❌ Invalid or expired code. Get a new one in Finance Lab → Settings.");
    } else {
      await sendMessage(chatId, `✅ Linked!\n\n${HELP_TEXT}`);
    }
    return new Response("ok");
  }

  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id, pending")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!link) {
    await sendMessage(chatId, "Not linked yet. Finance Lab → Settings → Connect Telegram, then send /link CODE here.");
    return new Response("ok");
  }

  if (text === "/cancel") {
    await setPending(link.user_id, null);
    await sendMessage(chatId, "Cancelled.");
    return new Response("ok");
  }
  if (text === "/help" || text === "/start") {
    await sendMessage(chatId, HELP_TEXT);
    return new Response("ok");
  }

  const pending = link.pending as Pending | null;
  const investCmd = parseInvest(text);

  // --- Continue a pending invest flow with a text reply ---
  if (pending?.flow === "invest" && !investCmd) {
    if (pending.step === "qty") {
      const qty = parseQty(text);
      if (qty) {
        await completeInvest(chatId, link.user_id, { ...pending, qty });
      } else {
        await sendMessage(chatId, 'Please reply with a number (e.g. 1 or 0.5), or /cancel.');
      }
      return new Response("ok");
    }
    if (pending.step === "new_name" || pending.step === "asset") {
      await handleAssetName(chatId, link.user_id, pending, text);
      return new Response("ok");
    }
    // create_confirm / tier expect a button press
    await sendMessage(chatId, "Please use the buttons above, or /cancel.");
    return new Response("ok");
  }

  // --- New invest command (also aborts any stale pending flow) ---
  if (investCmd) {
    await startInvest(chatId, link.user_id, investCmd.amount, investCmd.assetWords, investCmd.qty);
    return new Response("ok");
  }
  if (text.toLowerCase().startsWith("invest") || text.toLowerCase() === "inv") {
    await sendMessage(chatId, 'Format: invest amount asset qty\ne.g. "invest 1tr gold 1" or just "invest 1tr"');
    return new Response("ok");
  }

  // --- Expense ---
  const { data: categories } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", link.user_id);

  const parsed = parseExpense(text, (categories ?? []).map((c: { name: string }) => c.name));
  if (!parsed) {
    await supabase.from("telegram_bot_logs").update({ status: "parse_failed" }).eq("id", logRow!.id);
    await sendMessage(chatId, `Couldn't parse that.\n\n${HELP_TEXT}`);
    return new Response("ok");
  }

  // "1tr gold" — no category match, but it IS one of the user's assets → invest flow
  if (!parsed.categoryMatched && parsed.restWords.length > 0) {
    const asset = await findAsset(link.user_id, parsed.restWords.join(" "));
    if (asset) {
      await askQuantity(chatId, link.user_id, {
        flow: "invest",
        step: "qty",
        amount: parsed.amount,
        assetId: asset.id,
        assetName: asset.name,
      });
      return new Response("ok");
    }
  }

  const { ok, text: reply } = await callAgentLog({
    type: "expense",
    amount: parsed.amount,
    category_name: parsed.categoryName,
    note: parsed.note,
  });

  await supabase.from("telegram_bot_logs")
    .update({
      status: ok ? "ok" : "agent_log_failed",
      parsed: { amount: parsed.amount, category: parsed.categoryName, note: parsed.note },
    })
    .eq("id", logRow!.id);

  await sendMessage(chatId, reply);

  return new Response("ok");
});
