import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PRICE_CRON_SECRET = Deno.env.get("PRICE_CRON_SECRET");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const FETCH_TIMEOUT = 10_000;

// ---------- Crypto (CoinGecko, free, no key) ----------

// token or substring → CoinGecko id
const COIN_MAP: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum",
  bnb: "binancecoin",
  sol: "solana", solana: "solana",
  xrp: "ripple", ripple: "ripple",
  ada: "cardano", cardano: "cardano",
  doge: "dogecoin", dogecoin: "dogecoin",
  dot: "polkadot", polkadot: "polkadot",
  ltc: "litecoin", litecoin: "litecoin",
  link: "chainlink", chainlink: "chainlink",
  avax: "avalanche-2",
  near: "near",
  ton: "the-open-network",
  sui: "sui",
  usdt: "tether", tether: "tether",
  usdc: "usd-coin",
};

function coinIdFor(name: string): string | null {
  const tokens = name.toLowerCase().split(/[\s\-_./()]+/).filter(Boolean);
  for (const t of tokens) if (COIN_MAP[t]) return COIN_MAP[t];
  return null;
}

async function fetchCryptoPricesVND(ids: string[]): Promise<Record<string, number>> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=vnd`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = await res.json();
  const out: Record<string, number> = {};
  for (const id of ids) {
    const v = json?.[id]?.vnd;
    if (typeof v === "number" && v > 0) out[id] = v;
  }
  return out;
}

// ---------- Gold (SJC XML feed) ----------

// Returns VND per lượng (37.5g). The feed's unit has changed over the years,
// so normalize by magnitude and sanity-clamp instead of trusting it.
async function fetchGoldPricePerLuong(): Promise<number> {
  const res = await fetch("https://sjc.com.vn/xml/tygiavang.xml", {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`SJC ${res.status}`);
  const xml = await res.text();

  // First <item ... sell="..."> is SJC 1L (HCMC)
  const m = xml.match(/<item[^>]*\bsell="([\d.,]+)"/i);
  if (!m) throw new Error("SJC: no sell price in feed");

  let v = parseFloat(m[1].replace(/,/g, ""));
  if (!isFinite(v) || v <= 0) throw new Error("SJC: unparseable price");

  // Normalize to VND/lượng: feed historically quotes nghìn đồng/lượng
  if (v < 1_000_000) v *= 1_000;

  if (v < 30_000_000 || v > 1_000_000_000) {
    throw new Error(`SJC: price out of sane range (${v})`);
  }
  return Math.round(v);
}

// Users log gold in chỉ (3.75g) or lượng (10 chỉ). Infer per entry from what
// they paid: pick whichever unit is closer to purchase_price in log space.
function goldPriceForEntry(purchasePrice: number, perLuong: number): number {
  const perChi = perLuong / 10;
  if (!purchasePrice || purchasePrice <= 0) return Math.round(perChi);
  const dChi = Math.abs(Math.log(purchasePrice / perChi));
  const dLuong = Math.abs(Math.log(purchasePrice / perLuong));
  return Math.round(dLuong < dChi ? perLuong : perChi);
}

// ---------- Main ----------

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  // Auth: cron secret (all users) or a user JWT (own entries only)
  let userId: string | null = null;
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = !!PRICE_CRON_SECRET && cronSecret === PRICE_CRON_SECRET;
  if (!isCron) {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }
    userId = data.user.id;
  }

  let query = admin
    .from("portfolio_entries")
    .select("id, name, type, purchase_price, current_price")
    .in("type", ["Gold", "Crypto"]);
  if (userId) query = query.eq("user_id", userId);

  const { data: entries, error: qErr } = await query;
  if (qErr) return new Response(JSON.stringify({ error: qErr.message }), { status: 500 });
  if (!entries?.length) {
    return new Response(JSON.stringify({ ok: true, updated: 0, skipped: [], errors: [] }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const errors: string[] = [];
  const skipped: string[] = [];

  // Fetch market data (only what's needed) in parallel
  const needGold = entries.some((e: any) => e.type === "Gold");
  const coinIds = [...new Set(
    entries.filter((e: any) => e.type === "Crypto")
      .map((e: any) => coinIdFor(e.name))
      .filter(Boolean) as string[],
  )];

  const [goldRes, cryptoRes] = await Promise.allSettled([
    needGold ? fetchGoldPricePerLuong() : Promise.resolve(null),
    coinIds.length ? fetchCryptoPricesVND(coinIds) : Promise.resolve({}),
  ]);

  const goldPerLuong = goldRes.status === "fulfilled" ? goldRes.value : null;
  if (goldRes.status === "rejected") errors.push(`gold: ${goldRes.reason?.message ?? goldRes.reason}`);
  const cryptoPrices = cryptoRes.status === "fulfilled" ? cryptoRes.value : {};
  if (cryptoRes.status === "rejected") errors.push(`crypto: ${cryptoRes.reason?.message ?? cryptoRes.reason}`);

  let updated = 0;
  for (const e of entries as any[]) {
    let newPrice: number | null = null;

    if (e.type === "Gold" && goldPerLuong) {
      newPrice = goldPriceForEntry(Number(e.purchase_price), goldPerLuong);
    } else if (e.type === "Crypto") {
      const id = coinIdFor(e.name);
      if (id && cryptoPrices[id]) newPrice = Math.round(cryptoPrices[id]);
      else if (!id) skipped.push(e.name);
    }

    if (newPrice && newPrice !== Number(e.current_price)) {
      const { error: uErr } = await admin
        .from("portfolio_entries")
        .update({ current_price: newPrice, updated_at: new Date().toISOString() })
        .eq("id", e.id);
      if (uErr) errors.push(`${e.name}: ${uErr.message}`);
      else updated++;
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    updated,
    skipped,
    errors,
    gold_per_luong: goldPerLuong,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
