// Забирает официальные курсы Банка Израиля и сохраняет boi-rates.json
// (база EUR: 1 EUR = rates[code]). Запускается в GitHub Actions, где нет
// ограничения CORS. Логирует структуру ответа для отладки.
const fs = require("fs");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en,he;q=0.9",
};

async function main() {
  const url = "https://boi.org.il/PublicApi/GetExchangeRates?asJson=true";
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error("BOI HTTP " + r.status);
  const d = await r.json();

  console.log("Ответ BOI, ключи:", Object.keys(d));
  const list = d.exchangeRates || d.ExchangeRates || [];
  console.log("Валют в списке:", list.length, "пример:", JSON.stringify(list[0] || null));

  const ils = { ILS: 1 }; // шекелей за 1 единицу валюты
  for (const e of list) {
    const code = (e.key || e.Key || "").toUpperCase();
    const rate = e.currentExchangeRate != null ? e.currentExchangeRate : e.CurrentExchangeRate;
    const unit = (e.unit != null ? e.unit : e.Unit) || 1;
    if (code && rate) ils[code] = rate / unit;
  }
  if (!ils.EUR) throw new Error("В ответе BOI нет курса EUR");

  const eurInIls = ils.EUR;
  const rates = { EUR: 1, ILS: eurInIls };
  for (const code of Object.keys(ils)) {
    if (code !== "ILS" && ils[code]) rates[code] = eurInIls / ils[code];
  }

  const date = (d.lastUpdate || d.LastUpdate || new Date().toISOString()).slice(0, 10);
  const out = { source: "boi", date, updatedAt: new Date().toISOString(), rates };
  fs.writeFileSync("boi-rates.json", JSON.stringify(out, null, 2));
  console.log("Записано boi-rates.json:", Object.keys(rates).length, "валют, дата", date);
}

main().catch((e) => {
  console.error("ОШИБКА:", e.message);
  process.exit(1);
});
