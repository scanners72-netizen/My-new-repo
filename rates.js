// Список распространённых валют: код, название, флаг, число знаков после запятой.
const CURRENCIES = [
  { code: "EUR", name: "Евро",                     flag: "🇪🇺", dp: 2 },
  { code: "USD", name: "Доллар США",               flag: "🇺🇸", dp: 2 },
  { code: "ILS", name: "Израильский шекель",        flag: "🇮🇱", dp: 2 },
  { code: "GBP", name: "Фунт стерлингов",          flag: "🇬🇧", dp: 2 },
  { code: "CHF", name: "Швейцарский франк",        flag: "🇨🇭", dp: 2 },
  { code: "JPY", name: "Японская иена",            flag: "🇯🇵", dp: 0 },
  { code: "CNY", name: "Китайский юань",           flag: "🇨🇳", dp: 2 },
  { code: "RUB", name: "Российский рубль",         flag: "🇷🇺", dp: 2 },
  { code: "UAH", name: "Украинская гривна",        flag: "🇺🇦", dp: 2 },
  { code: "PLN", name: "Польский злотый",          flag: "🇵🇱", dp: 2 },
  { code: "CZK", name: "Чешская крона",            flag: "🇨🇿", dp: 2 },
  { code: "HUF", name: "Венгерский форинт",        flag: "🇭🇺", dp: 0 },
  { code: "RON", name: "Румынский лей",            flag: "🇷🇴", dp: 2 },
  { code: "BGN", name: "Болгарский лев",           flag: "🇧🇬", dp: 2 },
  { code: "DKK", name: "Датская крона",            flag: "🇩🇰", dp: 2 },
  { code: "SEK", name: "Шведская крона",           flag: "🇸🇪", dp: 2 },
  { code: "NOK", name: "Норвежская крона",         flag: "🇳🇴", dp: 2 },
  { code: "ISK", name: "Исландская крона",         flag: "🇮🇸", dp: 0 },
  { code: "TRY", name: "Турецкая лира",            flag: "🇹🇷", dp: 2 },
  { code: "CAD", name: "Канадский доллар",         flag: "🇨🇦", dp: 2 },
  { code: "AUD", name: "Австралийский доллар",     flag: "🇦🇺", dp: 2 },
  { code: "NZD", name: "Новозеландский доллар",    flag: "🇳🇿", dp: 2 },
  { code: "HKD", name: "Гонконгский доллар",       flag: "🇭🇰", dp: 2 },
  { code: "SGD", name: "Сингапурский доллар",      flag: "🇸🇬", dp: 2 },
  { code: "KRW", name: "Южнокорейская вона",       flag: "🇰🇷", dp: 0 },
  { code: "INR", name: "Индийская рупия",          flag: "🇮🇳", dp: 2 },
  { code: "BRL", name: "Бразильский реал",         flag: "🇧🇷", dp: 2 },
  { code: "MXN", name: "Мексиканское песо",        flag: "🇲🇽", dp: 2 },
  { code: "ZAR", name: "Южноафриканский рэнд",     flag: "🇿🇦", dp: 2 },
  { code: "AED", name: "Дирхам ОАЭ",               flag: "🇦🇪", dp: 2 },
  { code: "SAR", name: "Саудовский риял",          flag: "🇸🇦", dp: 2 },
  { code: "EGP", name: "Египетский фунт",          flag: "🇪🇬", dp: 2 },
  { code: "THB", name: "Тайский бат",              flag: "🇹🇭", dp: 2 },
  { code: "IDR", name: "Индонезийская рупия",      flag: "🇮🇩", dp: 0 },
  { code: "MYR", name: "Малайзийский ринггит",     flag: "🇲🇾", dp: 2 },
  { code: "PHP", name: "Филиппинское песо",        flag: "🇵🇭", dp: 2 }
];

// Резервная таблица курсов относительно EUR (1 EUR = X валюты).
// Используется только при отсутствии сети. Примерные значения; живые курсы
// загружаются из ЕЦБ / Банка Израиля и перезаписывают эти данные.
const FALLBACK_EUR = {
  EUR: 1,        USD: 1.08,    ILS: 4.00,   GBP: 0.85,   CHF: 0.94,
  JPY: 168,      CNY: 7.80,    RUB: 98,     UAH: 44,     PLN: 4.30,
  CZK: 25.2,     HUF: 395,     RON: 4.97,   BGN: 1.96,   DKK: 7.46,
  SEK: 11.4,     NOK: 11.6,    ISK: 150,    TRY: 38,     CAD: 1.47,
  AUD: 1.64,     NZD: 1.78,    HKD: 8.43,   SGD: 1.45,   KRW: 1470,
  INR: 90,       BRL: 5.90,    MXN: 19.8,   ZAR: 19.8,   AED: 3.97,
  SAR: 4.05,     EGP: 53,      THB: 38.5,   IDR: 17000,  MYR: 4.95,
  PHP: 62
};
