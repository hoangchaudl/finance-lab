import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const AGENT_LOG_TOKEN = Deno.env.get("AGENT_LOG_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function parseMessage(
  text: string,
): { amount: number; categoryName: string } | null {
  let amount: number | null = null;
  let matchStr = "";

  const tr = text.match(/(\d+([.,]\d+)?)\s*tr\b/i);
  const k = text.match(/(\d+([.,]\d+)?)\s*k\b/i);
  const plain = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,})/);

  if (tr) {
    amount = Math.round(parseFloat(tr[1].replace(",", ".")) * 1_000_000);
    matchStr = tr[0];
  } else if (k) {
    amount = Math.round(parseFloat(k[1].replace(",", ".")) * 1_000);
    matchStr = k[0];
  } else if (plain) {
    amount = parseInt(plain[1].replace(/[.,]/g, ""), 10);
    matchStr = plain[0];
  }

  if (!amount) return null;

  const categoryName = text.replace(matchStr, "").trim() || "Uncategorized";
  return { amount, categoryName };
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== TELEGRAM_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message?.text) return new Response("ok");

  const chatId = message.chat.id as number;
  const text = (message.text as string).trim();

  const { data: logRow } = await supabase
    .from("telegram_bot_logs")
    .insert({ telegram_chat_id: chatId, raw_text: text })
    .select()
    .single();

  // --- Linking flow ---
  if (text.startsWith("/link")) {
    const code = text.replace("/link", "").trim();
    const { data: link, error } = await supabase
      .from("telegram_links")
      .update({
        telegram_chat_id: chatId,
        link_code: null,
        linked_at: new Date().toISOString(),
      })
      .eq("link_code", code)
      .is("telegram_chat_id", null)
      .select()
      .single();

    if (error || !link) {
      await sendMessage(
        chatId,
        "❌ Invalid or expired code. Get a new one in Finance Lab → Settings.",
      );
    } else {
      await sendMessage(
        chatId,
        '✅ Linked! Text me things like "50k coffee" and I\'ll log them.',
      );
    }
    return new Response("ok");
  }

  // --- Regular message: must be linked already ---
  const { data: link } = await supabase
    .from("telegram_links")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!link) {
    await sendMessage(
      chatId,
      "Not linked yet. Finance Lab → Settings → Connect Telegram, then send /link CODE here.",
    );
    return new Response("ok");
  }

  const parsed = parseMessage(text);
  if (!parsed) {
    await supabase
      .from("telegram_bot_logs")
      .update({ status: "parse_failed" })
      .eq("id", logRow!.id);
    await sendMessage(chatId, 'Couldn\'t find an amount. Try "50k coffee".');
    return new Response("ok");
  }

  // --- Delegate to agent-log-transaction (same endpoint OpenClaw already uses) ---
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/agent-log-transaction`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_LOG_TOKEN}`,
      },
      body: JSON.stringify({
        type: "expense",
        amount: parsed.amount,
        category_name: parsed.categoryName,
        note: text,
      }),
    },
  );

  const result = await res.json();

  await supabase
    .from("telegram_bot_logs")
    .update({
      status: res.ok ? "ok" : "agent_log_failed",
      parsed: { amount: parsed.amount, category: parsed.categoryName },
    })
    .eq("id", logRow!.id);

  await sendMessage(
    chatId,
    result.reply_text ?? `⚠️ ${result.error ?? "Something went wrong."}`,
  );

  return new Response("ok");
});
