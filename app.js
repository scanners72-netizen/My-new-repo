"use strict";

const APP_VERSION = "3.0";

// Определение браузера (для подсказок по установке).
function detectBrowser() {
  const ua = navigator.userAgent;
  if (navigator.brave) return "Brave";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/YaBrowser/i.test(ua)) return "Яндекс.Браузер";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/EdgA|Edg/i.test(ua)) return "Edge";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS/i.test(ua)) return "Chrome (iOS)";
  if (/Chrome/i.test(ua)) return "Chrome";
  return "браузер не распознан";
}

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

// ---- Сохранение выбора пользователя ----
function savePrefs() {
  try {
    localStorage.setItem("from", fromSel.value);
    localStorage.setItem("to", toSel.value);
    localStorage.setItem("amount", amountEl.value);
  } catch (e) {}
}

// ---- Пересчёт основного блока ----
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

  $("clearAmount").addEventListener("click", () => {
    amountEl.value = "";
    update();
    amountEl.focus();
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

// ---- Кнопка «Скачать на телефон» ----
function setupInstall() {
  const btn = $("installBtn");
  const help = $("installHelp");
  const helpText = $("installHelpText");

  // Уже установлено (запущено как приложение) — кнопку не показываем.
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const browser = detectBrowser();
  const isSamsung = browser === "Samsung Internet";
  const status = $("installStatus");
  let deferredPrompt = null;
  let wantsInstall = false; // пользователь нажал кнопку до готовности окна
  let promptFired = false;

  function setStat(text) {
    status.textContent = text;
    status.classList.remove("hidden");
  }

  async function triggerInstall() {
    if (!deferredPrompt) return false;
    help.classList.add("hidden");
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    return true;
  }

  // Android/Chrome: ловим системное событие установки (создаёт WebAPK без бейджа).
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    promptFired = true;
    btn.textContent = "📲 Установить приложение";
    setStat("✅ Установка доступна — нажмите кнопку");
    if (wantsInstall) { wantsInstall = false; triggerInstall(); }
  });

  // Кнопку показываем всегда, пока приложение не установлено.
  btn.classList.remove("hidden");
  if (!isIOS) {
    setStat(`⏳ Проверяю установку… (браузер: ${browser})`);
    // Диагностика: если за 8 c браузер не предложил установку — сообщаем.
    setTimeout(() => {
      if (!promptFired && !deferredPrompt) {
        setStat(
          isSamsung
            ? `ⓘ ${browser} не показывает кнопку установки. Откройте сайт в Google Chrome — там установка в один тап.`
            : `ⓘ Браузер (${browser}) пока не предлагает установку. Введите сумму и подождите пару секунд.`
        );
      }
    }, 8000);
  }

  btn.addEventListener("click", async () => {
    if (await triggerInstall()) return;

    if (isIOS) {
      helpText.innerHTML =
        "<p>На iPhone (через Safari):</p><ol>" +
        "<li>Нажмите «Поделиться» <b>⬆️</b> внизу экрана</li>" +
        "<li>Выберите <b>«На экран «Домой»»</b></li>" +
        "<li>Нажмите <b>«Добавить»</b></li></ol>";
      help.classList.remove("hidden");
      return;
    }

    if (isSamsung) {
      helpText.innerHTML =
        "<p>Вы используете <b>Samsung Internet</b>. Чтобы установить приложение " +
        "<b>без значка браузера</b>, надёжнее всего открыть этот сайт в " +
        "<b>Google Chrome</b>:</p><ol>" +
        "<li>Установите Google Chrome из Play Маркета (если ещё нет)</li>" +
        "<li>Откройте в Chrome адрес этого сайта</li>" +
        "<li>Нажмите зелёную кнопку «Установить приложение»</li></ol>" +
        "<p>Либо в Samsung Internet: меню <b>☰</b> внизу → <b>«Добавить страницу на»</b> → " +
        "<b>«Главный экран»</b> (значок может быть с эмблемой браузера).</p>";
      help.classList.remove("hidden");
      return;
    }

    // Chrome: окно установки ещё не готово — ждём его и откроем автоматически.
    wantsInstall = true;
    helpText.innerHTML =
      "<p>Готовлю установку…</p>" +
      "<p>Окно установки появится автоматически через 1–2 секунды. " +
      "Если нет — введите любую сумму в конвертере (это «активирует» страницу) " +
      "и нажмите кнопку ещё раз.</p>";
    help.classList.remove("hidden");
  });

  $("helpClose").addEventListener("click", () => help.classList.add("hidden"));

  // После установки прячем кнопку.
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    btn.classList.add("hidden");
    help.classList.add("hidden");
    status.classList.add("hidden");
  });
}

// ---- Регистрация service worker (офлайн-режим) ----
// Без авто-перезагрузки: при стратегии "сеть в приоритете" свежие файлы и так
// грузятся при каждом открытии, а лишний reload мешал Chrome показать окно
// установки приложения.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ---- Инициализация ----
$("ver").textContent = "Версия " + APP_VERSION;
setupInstall();

// Восстанавливаем последний выбор пользователя (валюты и сумму).
const savedFrom = localStorage.getItem("from") || "EUR";
const savedTo = localStorage.getItem("to") || "ILS";
const savedAmount = localStorage.getItem("amount");
fillSelect(fromSel, CURRENCIES.some((c) => c.code === savedFrom) ? savedFrom : "EUR");
fillSelect(toSel, CURRENCIES.some((c) => c.code === savedTo) ? savedTo : "ILS");
fillSelect($("addCur"), "JPY");
if (savedAmount !== null) amountEl.value = savedAmount;

bind();
renderWatch();
loadRates();
