// Serverless-функция Vercel: отдаёт курсы в браузер, обходя CORS.
// Источник Банка Израиля доступен только с сервера (без CORS), поэтому
// официальные курсы BOI подтягиваются здесь и приводятся к базе EUR.
//
// GET /api/rates?source=boi  -> официальные курсы Банка Израиля
// GET /api/rates?source=ecb  -> референсные курсы ЕЦБ (Frankfurter)

export default async function handler(req, res) {
  const source = (req.query.source || "ecb").toLowerCase();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  try {
    const data = source === "boi" ? await getBOI() : await getECB();
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: String(err && err.message || err) });
  }
}

// ЕЦБ через Frankfurter (база EUR).
async function getECB() {
  const r = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR");
  if (!r.ok) throw new Error("ECB HTTP " + r.status);
  const d = await r.json();
  return { source: "ecb", date: d.date, rates: { EUR: 1, ...d.rates } };
}

// Банк Израиля: официальные представительные курсы валют к шекелю,
// пересчитанные в базу EUR (1 EUR = rates[code]).
async function getBOI() {
  const r = await fetch("https://boi.org.il/PublicApi/GetExchangeRates?asJson=true", {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error("BOI HTTP " + r.status);
  const d = await r.json();
  const list = d.exchangeRates || d.ExchangeRates || [];

  const ils = { ILS: 1 }; // шекелей за 1 единицу валюты
  for (const e of list) {
    const code = (e.key || e.Key || "").toUpperCase();
    const rate = e.currentExchangeRate ?? e.CurrentExchangeRate;
    const unit = e.unit ?? e.Unit ?? 1;
    if (code && rate) ils[code] = rate / unit;
  }
  if (!ils.EUR) throw new Error("BOI: нет курса EUR");

  const eurInIls = ils.EUR;
  const rates = { EUR: 1, ILS: eurInIls };
  for (const code of Object.keys(ils)) {
    if (code !== "ILS" && ils[code]) rates[code] = eurInIls / ils[code];
  }
  const date = (d.lastUpdate || d.LastUpdate || "").slice(0, 10);
  return { source: "boi", date, rates };
}
