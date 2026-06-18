// Готовит папку www/ для Capacitor: копирует туда веб-приложение.
// Файл boi-rates.json и папку api НЕ копируем — в приложении курсы
// подтягиваются из сети (живые), а не из снимка на момент сборки.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");

const files = [
  "index.html",
  "styles.css",
  "i18n.js",
  "rates.js",
  "app.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
}
console.log("www готова:", files.length, "файлов");
