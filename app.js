"use strict";

// ---- Состояние ----
// rates: курсы относительно EUR (1 EUR = rates[code]).
let rates = { ...FALLBACK_EUR };
let source = "ecb";          // "ecb" | "boi"
let lastUpdated = null;      // строка с датой курсов
let isLive = false;          // загружены ли живые курсы

const $ = (id) => document.getElementById(id);
const fromSel = $("from");
const toSel = $("to");
const amountEl = $("amount");
const resultEl = $("result");

// ---- Заполнение выпадающих списков ----
function fillSelect(sel, selected) {
  sel.innerHTML = "";
  for (const c of CURRENCIES) {
    const opt = document.createElement("option");
    opt.value = c.code;
    opt.textContent = `${c.flag} ${c.code} — ${c.name}`;
    if (c.code === selected) opt.selected = true;
    sel.appendChild(opt);
  }
}

function meta(code) {
  return CURRENCIES.find((c) => c.code === code) || { dp: 2 };
}

// ---- Конвертация (через EUR как базу) ----
function convert(amount, from, to) {
  if (!rates[from] || !rates[to]) return null;
  const inEur = amount / rates[from];
  return inEur * rates[to];
}

function fmt(value, code) {
  const dp = meta(code).dp;
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

// ---- Пересчёт и отображение ----
function update() {
  const amount = parseFloat(amountEl.value);
  const from = fromSel.value;
  const to = toSel.value;

  if (isNaN(amount)) {
    resultEl.value = "";
    $("rateLine").textContent = "—";
    return;
  }

  const res = convert(amount, from, to);
  if (res === null) {
    resultEl.value = "—";
    $("rateLine").textContent = "Курс недоступен для выбранной валюты";
    return;
  }
  resultEl.value = fmt(res, to);

  const one = convert(1, from, to);
  $("rateLine").textContent = `1 ${from} = ${fmt(one, to)} ${to}`;

  renderQuick(from);
}

// ---- Быстрые курсы выбранной валюты к популярным ----
function renderQuick(base) {
  const popular = ["USD", "EUR", "ILS", "GBP", "CHF", "RUB"].filter((c) => c !== base);
  const box = $("quick");
  box.innerHTML = "";
  for (const code of popular) {
    const v = convert(1, base, code);
    if (v === null) continue;
    const card = document.createElement("div");
    card.className = "qcard";
    card.innerHTML = `<span class="qcode">${meta(code).flag} ${code}</span>
                      <span class="qval">${fmt(v, code)}</span>`;
    box.appendChild(card);
  }
}

// ---- Загрузка курсов ЕЦБ через Frankfurter (CORS разрешён) ----
async function loadECB() {
  const codes = CURRENCIES.map((c) => c.code).filter((c) => c !== "EUR");
  const url = `https://api.frankfurter.app/latest?from=EUR&to=${codes.join(",")}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("ECB HTTP " + r.status);
  const data = await r.json();
  const next = { EUR: 1 };
  for (const [k, v] of Object.entries(data.rates)) next[k] = v;
  return { rates: next, date: data.date };
}

// ---- Загрузка официальных курсов Банка Израиля ----
// API BOI отдаёт курсы валют к шекелю (ILS). Пересчитываем в базу EUR.
async function loadBOI() {
  const r = await fetch("https://boi.org.il/PublicApi/GetExchangeRates?asJson=true");
  if (!r.ok) throw new Error("BOI HTTP " + r.status);
  const data = await r.json();
  const list = data.exchangeRates || data.ExchangeRates || [];

  // ils[CODE] = сколько шекелей за 1 единицу валюты
  const ils = { ILS: 1 };
  for (const e of list) {
    const code = (e.key || e.Key || "").toUpperCase();
    const rate = e.currentExchangeRate ?? e.CurrentExchangeRate;
    const unit = e.unit ?? e.Unit ?? 1;
    if (code && rate) ils[code] = rate / unit; // шекелей за 1 единицу
  }
  if (!ils.EUR) throw new Error("BOI: нет курса EUR");

  // База EUR: rates[code] = единиц валюты за 1 EUR
  const eurInIls = ils.EUR; // шекелей за 1 EUR
  const next = {};
  for (const c of CURRENCIES) {
    const code = c.code;
    if (ils[code]) next[code] = eurInIls / ils[code];
  }
  next.EUR = 1;
  next.ILS = eurInIls;
  const date = (data.lastUpdate || data.LastUpdate || "").slice(0, 10);
  return { rates: next, date };
}

async function loadRates() {
  setStatus("Загрузка курсов…", "");
  try {
    const out = source === "boi" ? await loadBOI() : await loadECB();
    // Сохраняем резервные значения для валют, которых нет в источнике.
    rates = { ...FALLBACK_EUR, ...out.rates };
    lastUpdated = out.date;
    isLive = true;
    const label = source === "boi" ? "Банк Израиля" : "ЕЦБ";
    setStatus(`✅ Актуальные курсы: ${label}`, "ok");
    $("updated").textContent = lastUpdated ? `Курсы на ${lastUpdated}` : "";
  } catch (err) {
    rates = { ...FALLBACK_EUR };
    isLive = false;
    setStatus("⚠️ Нет связи с источником — показаны резервные курсы", "warn");
    $("updated").textContent = "Резервная таблица";
  }
  update();
}

function setStatus(text, cls) {
  const el = $("status");
  el.textContent = text;
  el.className = "status " + cls;
}

// ---- События ----
function bind() {
  amountEl.addEventListener("input", update);
  fromSel.addEventListener("change", update);
  toSel.addEventListener("change", update);

  $("swap").addEventListener("click", () => {
    const a = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = a;
    update();
  });

  $("refresh").addEventListener("click", loadRates);

  document.querySelectorAll(".src-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".src-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      source = btn.dataset.source;
      loadRates();
    });
  });
}

// ---- Инициализация ----
fillSelect(fromSel, "EUR");
fillSelect(toSel, "ILS");
bind();
loadRates();
