"use strict";

const APP_VERSION = "2.2";

// ---- Состояние ----
let rates = { ...FALLBACK_EUR };   // курсы относительно EUR (1 EUR = rates[code])
let source = "ecb";                // "ecb" | "boi"
let lastUpdated = null;
let watch = loadWatch();           // настраиваемый список валют (карточки)

const $ = (id) => document.getElementById(id);
const fromSel = $("from");
const toSel = $("to");
const amountEl = $("amount");
const resultEl = $("result");

// ---- Список наблюдаемых валют (localStorage) ----
function loadWatch() {
  try {
    const saved = JSON.parse(localStorage.getItem("watchList"));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (e) {}
  return ["USD", "EUR", "ILS", "GBP", "CHF", "RUB"];
}
function saveWatch() {
  try { localStorage.setItem("watchList", JSON.stringify(watch)); } catch (e) {}
}

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
  return CURRENCIES.find((c) => c.code === code) || { dp: 2, flag: "", name: code };
}

// ---- Конвертация (через EUR как базу) ----
function convert(amount, from, to) {
  if (!rates[from] || !rates[to]) return null;
  return (amount / rates[from]) * rates[to];
}

function fmt(value, code) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: meta(code).dp,
    maximumFractionDigits: meta(code).dp,
  });
}

// ---- Пересчёт основного блока ----
function update() {
  const amount = parseFloat(amountEl.value);
  const from = fromSel.value;
  const to = toSel.value;

  if (isNaN(amount)) {
    resultEl.value = "";
    $("rateLine").textContent = "—";
    renderWatch();
    return;
  }

  const res = convert(amount, from, to);
  if (res === null) {
    resultEl.value = "—";
    $("rateLine").textContent = "Курс недоступен для выбранной валюты";
  } else {
    resultEl.value = fmt(res, to);
    $("rateLine").textContent = `1 ${from} = ${fmt(convert(1, from, to), to)} ${to}`;
  }
  renderWatch();
}

// ---- Настраиваемый список валют ----
function renderWatch() {
  const amount = parseFloat(amountEl.value);
  const from = fromSel.value;
  const box = $("quick");
  box.innerHTML = "";

  for (const code of watch) {
    const v = isNaN(amount) ? convert(1, from, code) : convert(amount, from, code);
    if (v === null) continue;
    const card = document.createElement("div");
    card.className = "qcard";
    card.innerHTML =
      `<button class="qdel" title="Убрать" data-code="${code}">×</button>
       <span class="qcode">${meta(code).flag} ${code}</span>
       <span class="qval">${fmt(v, code)}</span>`;
    box.appendChild(card);
  }

  box.querySelectorAll(".qdel").forEach((b) => {
    b.addEventListener("click", () => {
      watch = watch.filter((c) => c !== b.dataset.code);
      saveWatch();
      renderWatch();
    });
  });
}

function addWatch() {
  const code = $("addCur").value;
  if (code && !watch.includes(code)) {
    watch.push(code);
    saveWatch();
    renderWatch();
  }
}

// ---- Загрузка курсов ----
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " HTTP " + r.status);
  return r.json();
}

// Универсальный источник: open.er-api.com — все распространённые валюты, CORS.
async function loadUniversal() {
  const d = await fetchJSON("https://open.er-api.com/v6/latest/EUR");
  const next = { EUR: 1 };
  for (const [k, v] of Object.entries(d.rates || {})) next[k] = v;
  return { rates: next, date: (d.time_last_update_utc || "").slice(0, 16) };
}

// ЕЦБ: референсные курсы евро (Frankfurter) поверх универсальных,
// чтобы по европейским валютам были точные данные ЕЦБ.
async function loadECB() {
  const [uni, fr] = await Promise.allSettled([
    loadUniversal(),
    fetchJSON("https://api.frankfurter.dev/v1/latest?base=EUR"),
  ]);
  let next = { EUR: 1 };
  let date = "";
  if (uni.status === "fulfilled") { Object.assign(next, uni.value.rates); date = uni.value.date; }
  if (fr.status === "fulfilled") { Object.assign(next, fr.value.rates); date = fr.value.date || date; }
  if (uni.status !== "fulfilled" && fr.status !== "fulfilled") throw new Error("ЕЦБ недоступен");
  return { rates: next, date, official: true };
}

// Банк Израиля: официальные курсы.
async function loadBOI() {
  // 1) Серверная функция (работает на Vercel, обходит CORS) — официальные курсы.
  try {
    const d = await fetchJSON("api/rates?source=boi");
    if (d && d.rates && d.rates.ILS) return { rates: d.rates, date: d.date, official: true };
  } catch (e) {}
  // 2) Прямой запрос к API BOI (если CORS разрешён).
  try {
    return await loadBOIDirect();
  } catch (e) {}
  // 3) Резерв: рыночные курсы (не официальные).
  const uni = await loadUniversal();
  return { rates: uni.rates, date: uni.date, official: false };
}

async function loadBOIDirect() {
  const data = await fetchJSON("https://boi.org.il/PublicApi/GetExchangeRates?asJson=true");
  const list = data.exchangeRates || data.ExchangeRates || [];
  const ils = { ILS: 1 }; // шекелей за 1 единицу валюты
  for (const e of list) {
    const code = (e.key || e.Key || "").toUpperCase();
    const rate = e.currentExchangeRate ?? e.CurrentExchangeRate;
    const unit = e.unit ?? e.Unit ?? 1;
    if (code && rate) ils[code] = rate / unit;
  }
  if (!ils.EUR) throw new Error("BOI: нет курса EUR");
  const eurInIls = ils.EUR;
  const next = { EUR: 1, ILS: eurInIls };
  for (const c of CURRENCIES) if (ils[c.code]) next[c.code] = eurInIls / ils[c.code];
  return { rates: next, date: (data.lastUpdate || data.LastUpdate || "").slice(0, 10), official: true };
}

async function loadRates() {
  setStatus("Загрузка курсов…", "");
  try {
    const out = source === "boi" ? await loadBOI() : await loadECB();
    rates = { ...FALLBACK_EUR, ...out.rates };
    lastUpdated = out.date;

    if (source === "boi" && out.official === false) {
      setStatus("⚠️ Рыночные курсы (официальный курс Банка Израиля — после деплоя на Vercel)", "warn");
    } else {
      const label = source === "boi" ? "Банк Израиля" : "ЕЦБ / банки Европы";
      setStatus(`✅ Актуальные курсы: ${label}`, "ok");
    }
    $("updated").textContent = lastUpdated ? `Курсы на ${lastUpdated}` : "";
  } catch (err) {
    rates = { ...FALLBACK_EUR };
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
  $("addBtn").addEventListener("click", addWatch);

  document.querySelectorAll(".src-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".src-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      source = btn.dataset.source;
      loadRates();
    });
  });
}

// ---- Регистрация service worker (офлайн-режим) ----
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload(); // подхватить свежую версию после обновления SW
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ---- Инициализация ----
$("ver").textContent = "Версия " + APP_VERSION;
fillSelect(fromSel, "EUR");
fillSelect(toSel, "ILS");
fillSelect($("addCur"), "JPY");
bind();
renderWatch();
loadRates();
