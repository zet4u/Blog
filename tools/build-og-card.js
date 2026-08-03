#!/usr/bin/env node
/* ============================================================
   build-og-card.js

   تصویر کارت اشتراک‌گذاری (assets/img/og-default.jpg) را از روی
   tools/og-card.html می‌سازد.

   چرا مرورگر؟
   فونت مدام شکل‌دهی حروف فارسی را با OpenType انجام می‌دهد و کدهای
   Arabic Presentation Forms را ندارد؛ به همین دلیل ابزارهایی که
   خودشان متن را reshape می‌کنند مربع خالی تولید می‌کردند.
   مرورگر همان موتور شکل‌دهی سایت را دارد، پس نتیجه دقیقاً درست است.

   اجرا:
     node tools/build-og-card.js

   پیش‌نیاز: chromium یا google-chrome روی سیستم نصب باشد.
   اگر نباشد، می‌توانی tools/og-card.html را در مرورگر باز کنی و دستی
   اسکرین‌شات ۱۲۰۰×۶۳۰ بگیری.
   ============================================================ */

"use strict";

const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CARD = path.join(ROOT, "tools", "og-card.html");
const OUT = path.join(ROOT, "assets", "img", "og-default.jpg");

const WIDTH = 1200;
const HEIGHT = 630;

/* ---------- پیدا کردن مرورگر ---------- */
function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate.includes(path.sep) || candidate.includes("/")) {
        if (fs.existsSync(candidate)) return candidate;
      } else {
        const probe = process.platform === "win32" ? "where" : "which";
        execSync(probe + " " + candidate, { stdio: "ignore" });
        return candidate;
      }
    } catch (error) {
      /* این گزینه نبود، بعدی را امتحان کن */
    }
  }
  return null;
}

function main() {
  if (!fs.existsSync(CARD)) {
    console.error("tools/og-card.html پیدا نشد.");
    process.exit(1);
  }

  const browser = findBrowser();
  if (!browser) {
    console.error(
      "مرورگر پیدا نشد. chromium یا chrome را نصب کن، یا مسیرش را در CHROME_PATH بگذار."
    );
    process.exit(1);
  }

  const tmpPng = path.join(os.tmpdir(), "og-card-" + Date.now() + ".png");
  const profile = path.join(os.tmpdir(), "og-profile-" + Date.now());

  console.log("browser:", browser);

  execFileSync(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--allow-file-access-from-files",
      "--user-data-dir=" + profile,
      "--window-size=" + WIDTH + "," + HEIGHT,
      "--screenshot=" + tmpPng,
      "--virtual-time-budget=8000",
      "file://" + CARD,
    ],
    { stdio: "ignore" }
  );

  if (!fs.existsSync(tmpPng)) {
    console.error("اسکرین‌شات ساخته نشد.");
    process.exit(1);
  }

  /* تبدیل به JPEG — اگر ImageMagick نباشد، PNG را نگه می‌داریم */
  let converted = false;
  for (const tool of ["magick", "convert"]) {
    try {
      execFileSync(tool, [tmpPng, "-strip", "-quality", "90", OUT], { stdio: "ignore" });
      converted = true;
      break;
    } catch (error) {
      /* ابزار بعدی */
    }
  }

  if (!converted) {
    const pngOut = OUT.replace(/\.jpg$/, ".png");
    fs.copyFileSync(tmpPng, pngOut);
    console.log("ImageMagick نبود — خروجی PNG ذخیره شد:", pngOut);
    console.log("یادت باشد مسیر og:image را در صفحه‌ها عوض کنی.");
  } else {
    console.log("ساخته شد:", OUT);
  }

  fs.rmSync(tmpPng, { force: true });
  fs.rmSync(profile, { recursive: true, force: true });
}

main();
