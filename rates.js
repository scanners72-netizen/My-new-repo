// ===== Валюты =====
// Полный список распространённых валют мира (ISO 4217). Названия валют
// подставляются автоматически на нужном языке через Intl.DisplayNames,
// поэтому здесь хранятся только коды, флаги и число знаков после запятой.

// Сначала популярные, затем остальные (по алфавиту).
const CURRENCY_CODES = [
  // Популярные
  "USD","EUR","ILS","GBP","CHF","JPY","CNY","RUB","UAH","GEL",
  "TRY","AED","SAR","INR","CAD","AUD","NZD","HKD","SGD","KRW",
  "PLN","CZK","HUF","RON","BGN","DKK","SEK","NOK","ISK","BRL",
  "MXN","ZAR","THB","IDR","MYR","PHP","EGP","KZT","AMD","AZN",
  // Остальные (по алфавиту)
  "AFN","ALL","ANG","AOA","ARS","AWG","BAM","BBD","BDT","BHD",
  "BIF","BMD","BND","BOB","BSD","BTN","BWP","BYN","BZD","CDF",
  "CLP","COP","CRC","CUP","CVE","DJF","DOP","DZD","ERN","ETB",
  "FJD","FKP","GHS","GIP","GMD","GNF","GTQ","GYD","HNL","HRK",
  "HTG","IQD","IRR","JMD","JOD","KES","KGS","KHR","KMF","KWD",
  "KYD","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA",
  "MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MZN","NAD",
  "NGN","NIO","NPR","OMR","PAB","PEN","PGK","PKR","PYG","QAR",
  "RSD","RWF","SBD","SCR","SDG","SHP","SLE","SOS","SRD","SSP",
  "STN","SYP","SZL","TJS","TMT","TND","TOP","TTD","TWD","TZS",
  "UGX","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XOF",
  "XPF","YER","ZMW"
];

// Валюты без дробной части.
const ZERO_DP = new Set([
  "BIF","CLP","DJF","GNF","ISK","JPY","KMF","KRW","PYG",
  "RWF","UGX","VND","VUV","XAF","XOF","XPF"
]);

// Особые флаги для валют, чей код не соответствует коду страны.
const FLAG_OVERRIDE = {
  EUR: "🇪🇺", XAF: "🌍", XOF: "🌍", XCD: "🏝️", XPF: "🇵🇫",
  ANG: "🇳🇱", XDR: "🏳️"
};

// Эмодзи-флаг из первых двух букв кода валюты (обычно = код страны).
function codeToFlag(code) {
  if (FLAG_OVERRIDE[code]) return FLAG_OVERRIDE[code];
  const cc = code.slice(0, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "💱";
  const base = 0x1f1e6;
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}

function dpOf(code) {
  return ZERO_DP.has(code) ? 0 : 2;
}

// Резервная таблица курсов относительно EUR (1 EUR = X валюты) — на случай
// отсутствия сети. Полные актуальные курсы загружаются из сети.
const FALLBACK_EUR = {
  EUR: 1,    USD: 1.08,  ILS: 4.00,  GBP: 0.85,  CHF: 0.94,
  JPY: 168,  CNY: 7.80,  RUB: 98,    UAH: 44,    GEL: 2.95,
  TRY: 38,   AED: 3.97,  SAR: 4.05,  INR: 90,    CAD: 1.47,
  AUD: 1.64, NZD: 1.78,  HKD: 8.43,  SGD: 1.45,  KRW: 1470,
  PLN: 4.30, CZK: 25.2,  HUF: 395,   RON: 4.97,  BGN: 1.96,
  DKK: 7.46, SEK: 11.4,  NOK: 11.6,  ISK: 150,   BRL: 5.90,
  MXN: 19.8, ZAR: 19.8,  THB: 38.5,  IDR: 17000, MYR: 4.95,
  PHP: 62,   EGP: 53,    KZT: 540,   AMD: 420,   AZN: 1.84
};
