"use strict";

const APP_VERSION = "4.0";

// ---- Состояние ----
let rates = { ...FALLBACK_EUR };
let source = "ecb";
let watch = loadWatch();
let installAvailable = false;
const last = { statusKey: "statusLoading", statusCls: "", updatedDate: null, isFallback: false };

const $ = (id) => document.getElementById(id);
const fromSel = $("from");
const toSel = $("to");
const amountEl = $("amount");
const resultEl = $("result");

// ---- Названия валют на текущем языке ----
const _dn = {};
function nameOf(code) {
  try {
    if (!_dn[currentLang]) _dn[currentLang] = new Intl.DisplayNames([currentLang], { type: "currency" });
    return _dn[currentLang].of(code) || code;
  } catch (e) {
    return code;
  }
}

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

// ---- Выпадающие списки ----
function fillSelect(sel, selected) {
  sel.innerHTML = "";
  for (const code of CURRENCY_CODES) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${codeToFlag(code)} ${code} — ${nameOf(code)}`;
    if (code === selected) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ---- Конвертация ----
function convert(amount, from, to) {
  if (!rates[from] || !rates[to]) return null;
  return (amount / rates[from]) * rates[to];
}
function fmt(value, code) {
  return value.toLocaleString(currentLang, {
    minimumFractionDigits: dpOf(code),
    maximumFractionDigits: dpOf(code),
  });
}

// ---- Сохранение выбора ----
function savePrefs() {
  try {
    localStorage.setItem("from", fromSel.value);
    localStorage.setItem("to", toSel.value);
    localStorage.setItem("amount", amountEl.value);
  } catch (e) {}
}

// ---- Пересчёт ----
function update() {
  savePrefs();
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
    $("rateLine").textContent = t("rateUnavailable");
  } else {
    resultEl.value = fmt(res, to);
    $("rateLine").textContent = `1 ${from} = ${fmt(convert(1, from, to), to)} ${to}`;
  }
  renderWatch();
}

// ---- Мои валюты ----
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
      `<button class="qdel" data-code="${code}" aria-label="×">×</button>
       <span class="qcode">${codeToFlag(code)} ${code}</span>
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

function addWatch(code) {
  if (code && !watch.includes(code)) {
    watch.push(code);
    saveWatch();
    renderWatch();
  }
}

// ---- Поиск валют ----
function searchCurrencies(query) {
  const box = $("curResults");
  const q = query.trim().toLowerCase();
  box.innerHTML = "";
  if (!q) {
    box.classList.add("hidden");
    return;
  }
  const matches = CURRENCY_CODES.filter(
    (code) => code.toLowerCase().includes(q) || nameOf(code).toLowerCase().includes(q)
  ).slice(0, 30);

  if (!matches.length) {
    const d = document.createElement("div");
    d.className = "cur-empty";
    d.textContent = t("noResults");
    box.appendChild(d);
  } else {
    for (const code of matches) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cur-row";
      row.innerHTML =
        `<span>${codeToFlag(code)} <b>${code}</b> — ${nameOf(code)}</span>` +
        `<span class="cur-mark">${watch.includes(code) ? "✓" : "＋"}</span>`;
      row.addEventListener("click", () => {
        addWatch(code);
        searchCurrencies($("curSearch").value);
      });
      box.appendChild(row);
    }
  }
  box.classList.remove("hidden");
}

// ---- Загрузка курсов ----
async function fetchJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " HTTP " + r.status);
  return r.json();
}

async function loadUniversal() {
  const d = await fetchJSON("https://open.er-api.com/v6/latest/EUR");
  const next = { EUR: 1 };
  for (const [k, v] of Object.entries(d.rates || {})) next[k] = v;
  return { rates: next, date: (d.time_last_update_utc || "").slice(0, 16) };
}

async function loadECB() {
  const [uni, fr] = await Promise.allSettled([
    loadUniversal(),
    fetchJSON("https://api.frankfurter.dev/v1/latest?base=EUR"),
  ]);
  let next = { EUR: 1 };
  let date = "";
  if (uni.status === "fulfilled") { Object.assign(next, uni.value.rates); date = uni.value.date; }
  if (fr.status === "fulfilled") { Object.assign(next, fr.value.rates); date = fr.value.date || date; }
  if (uni.status !== "fulfilled" && fr.status !== "fulfilled") throw new Error("ECB unavailable");
  return { rates: next, date, official: true };
}

async function loadBOI() {
  try {
    const d = await fetchJSON("api/rates?source=boi");
    if (d && d.rates && d.rates.ILS) return { rates: d.rates, date: d.date, official: true };
  } catch (e) {}
  try {
    return await loadBOIDirect();
  } catch (e) {}
  const uni = await loadUniversal();
  return { rates: uni.rates, date: uni.date, official: false };
}

async function loadBOIDirect() {
  const data = await fetchJSON("https://boi.org.il/PublicApi/GetExchangeRates?asJson=true");
  const list = data.exchangeRates || data.ExchangeRates || [];
  const ils = { ILS: 1 };
  for (const e of list) {
    const code = (e.key || e.Key || "").toUpperCase();
    const rate = e.currentExchangeRate ?? e.CurrentExchangeRate;
    const unit = e.unit ?? e.Unit ?? 1;
    if (code && rate) ils[code] = rate / unit;
  }
  if (!ils.EUR) throw new Error("BOI: no EUR");
  const eurInIls = ils.EUR;
  const next = { EUR: 1, ILS: eurInIls };
  for (const code of Object.keys(ils)) {
    if (code !== "ILS" && ils[code]) next[code] = eurInIls / ils[code];
  }
  return { rates: next, date: (data.lastUpdate || data.LastUpdate || "").slice(0, 10), official: true };
}

async function loadRates() {
  last.statusKey = "statusLoading";
  last.statusCls = "";
  refreshStatus();
  try {
    const out = source === "boi" ? await loadBOI() : await loadECB();
    rates = { ...FALLBACK_EUR, ...out.rates };
    last.updatedDate = out.date || null;
    last.isFallback = false;
    if (source === "boi" && out.official === false) {
      last.statusKey = "statusMarket";
      last.statusCls = "warn";
    } else {
      last.statusKey = source === "boi" ? "statusOkBoi" : "statusOkEcb";
      last.statusCls = "ok";
    }
  } catch (err) {
    rates = { ...FALLBACK_EUR };
    last.updatedDate = null;
    last.isFallback = true;
    last.statusKey = "statusOffline";
    last.statusCls = "warn";
  }
  refreshStatus();
  refreshUpdated();
  update();
}

function setStatus(key, cls) {
  const el = $("status");
  el.textContent = t(key);
  el.className = "status " + cls;
}
function refreshStatus() { setStatus(last.statusKey, last.statusCls); }
function refreshUpdated() {
  $("updated").textContent = last.isFallback
    ? t("fallback")
    : last.updatedDate ? t("ratesOn") + last.updatedDate : "";
}

// ---- Язык ----
function applyLang(lang) {
  if (!I18N[lang]) lang = "ru";
  currentLang = lang;
  try { localStorage.setItem("lang", lang); } catch (e) {}
  document.documentElement.lang = lang;
  document.documentElement.dir = I18N[lang].dir;

  $("title").textContent = t("title");
  $("subtitle").textContent = t("subtitle");
  document.querySelector('.src-btn[data-source="ecb"]').textContent = t("ecb");
  document.querySelector('.src-btn[data-source="boi"]').textContent = t("boi");
  $("myCurTitle").textContent = t("myCur");
  $("curSearch").placeholder = t("search");
  $("refresh").textContent = t("refresh");
  $("swap").title = t("swap");
  $("clearAmount").setAttribute("aria-label", t("clear"));
  $("helpClose").textContent = t("helpClose");
  $("disclaimer").textContent = t("disclaimer");
  $("ver").textContent = t("version") + " " + APP_VERSION;
  $("installBtn").textContent = installAvailable ? t("install") : t("installShort");

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.lang === lang)
  );

  // Перестроить списки и динамику на новом языке.
  const f = fromSel.value, to = toSel.value;
  fillSelect(fromSel, f);
  fillSelect(toSel, to);
  refreshStatus();
  refreshUpdated();
  update();
  if ($("curSearch").value) searchCurrencies($("curSearch").value);
}

// ---- Установка (без диагностики) ----
function setupInstall() {
  const btn = $("installBtn");
  const help = $("installHelp");
  const helpText = $("installHelpText");

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferred = null;
  let wants = false;

  async function doPrompt() {
    if (!deferred) return false;
    help.classList.add("hidden");
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    installAvailable = false;
    return true;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    installAvailable = true;
    btn.textContent = t("install");
    if (wants) { wants = false; doPrompt(); }
  });

  btn.classList.remove("hidden");
  btn.addEventListener("click", async () => {
    if (await doPrompt()) return;
    helpText.innerHTML = isIOS ? t("iosHelp") : t("androidHelp");
    if (!isIOS) wants = true;
    help.classList.remove("hidden");
  });

  $("helpClose").addEventListener("click", () => help.classList.add("hidden"));
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installAvailable = false;
    btn.classList.add("hidden");
    help.classList.add("hidden");
  });
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

  $("clearAmount").addEventListener("click", () => {
    amountEl.value = "";
    update();
    amountEl.focus();
  });

  $("curSearch").addEventListener("input", (e) => searchCurrencies(e.target.value));

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyLang(btn.dataset.lang));
  });

  document.querySelectorAll(".src-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".src-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      source = btn.dataset.source;
      loadRates();
    });
  });
}

// ---- Service worker ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ---- Инициализация ----
setupInstall();

const savedFrom = localStorage.getItem("from");
const savedTo = localStorage.getItem("to");
const savedAmount = localStorage.getItem("amount");
fillSelect(fromSel, CURRENCY_CODES.includes(savedFrom) ? savedFrom : "EUR");
fillSelect(toSel, CURRENCY_CODES.includes(savedTo) ? savedTo : "ILS");
if (savedAmount !== null) amountEl.value = savedAmount;

bind();
applyLang(currentLang);
loadRates();
