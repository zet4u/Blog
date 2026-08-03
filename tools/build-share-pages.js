#!/usr/bin/env node
/* ============================================================
   build-share-pages.js

   مشکلی که حل می‌کند:
   خزنده‌ی تلگرام، توییتر، واتساپ و لینکدین جاوااسکریپت اجرا نمی‌کند.
   پس post.html?id=... هر چقدر هم با JS عنوان را عوض کند، در
   پیش‌نمایش شبکه‌های اجتماعی همیشه متن پیش‌فرض دیده می‌شود.

   راه‌حل:
   برای هر رایت‌آپ یک فایل واقعی w/<id>.html ساخته می‌شود که
   متاتگ‌های اختصاصی خودش را دارد (عنوان = عنوان رایت‌آپ،
   توضیح = خلاصه‌ی رایت‌آپ) و دقیقاً همان محتوا را رندر می‌کند.

   اجرا:  node tools/build-share-pages.js
   خروجی: w/<id>.html برای هر رایت‌آپ ، و sitemap.xml

   لازم نیست دستی اجرایش کنی — گیت‌هاب اکشنز بعد از هر پوش
   خودش این را اجرا می‌کند. فایل ورکفلو: .github/workflows/share-pages.yml
   ============================================================ */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "w");

/* ---------- خواندن فایل‌های داده‌ی مرورگر در نود ---------- */
function loadGlobal(relativePath, key) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const win = {};
  new Function("window", source)(win);
  return win[key];
}

const posts = loadGlobal("writeups.js", "WRITEUPS") || [];
const config = loadGlobal("assets/js/config.js", "SITE_CONFIG") || {};

const site = config.site || {};
const profile = config.profile || {};

const SITE_URL = String(site.url || "https://zet3u.ir").replace(/\/+$/, "");
const AUTHOR = profile.name || "";
const LOCALE = site.locale || "fa_IR";
const THEME = site.themeColor || "#0E0F11";
const TWITTER = site.twitter || "";
const OG_IMAGE = SITE_URL + "/" + String(site.image || "").replace(/^\/+/, "");

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230E0F11'/%3E%3Ctext x='32' y='45' font-size='38' text-anchor='middle' fill='%23C9A86A' font-family='monospace' font-weight='bold'%3Ez%3C/text%3E%3C/svg%3E";

/* ---------- کمکی‌ها ---------- */
function escapeAttr(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* خلاصه باید تک‌خطی و کوتاه باشد؛ تلگرام حدود ۲۰۰ کاراکتر را نشان می‌دهد */
function toDescription(post) {
  const raw = String(post.excerpt || post.body || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`_|\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (raw.length <= 200) return raw;
  return raw.slice(0, 197).replace(/\s+\S*$/, "") + "…";
}

function toIsoDate(post) {
  const stamp = Number(post.updatedAt);
  if (!stamp || Number.isNaN(stamp)) return "";
  return new Date(stamp).toISOString();
}

function safeId(id) {
  /* فقط شناسه‌های سالم قبول می‌شوند تا مسیر فایل دستکاری نشود */
  return /^[A-Za-z0-9._-]+$/.test(String(id || "")) ? String(id) : null;
}

/* ---------- قالب صفحه‌ی رایت‌آپ ---------- */
function buildPostPage(post) {
  const id = safeId(post.id);
  const url = SITE_URL + "/w/" + id + ".html";
  const title = String(post.title || "").trim();
  const description = toDescription(post);
  const published = toIsoDate(post);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description,
    image: OG_IMAGE,
    inLanguage: "fa-IR",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Person", name: AUTHOR, url: SITE_URL },
    publisher: { "@type": "Person", name: AUTHOR, url: SITE_URL },
  };
  if (published) {
    jsonLd.datePublished = published;
    jsonLd.dateModified = published;
  }
  if (post.tag) jsonLd.articleSection = String(post.tag);

  const head = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<title>" + escapeAttr(title) + "</title>",

    '<meta name="description" content="' + escapeAttr(description) + '" />',
    '<meta name="author" content="' + escapeAttr(AUTHOR) + '" />',
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<meta name="theme-color" content="' + escapeAttr(THEME) + '" />',
    '<link rel="canonical" href="' + escapeAttr(url) + '" />',

    "<!-- Open Graph — تلگرام، واتساپ، لینکدین، دیسکورد -->",
    '<meta property="og:type" content="article" />',
    '<meta property="og:site_name" content="' + escapeAttr(AUTHOR) + '" />',
    '<meta property="og:locale" content="' + escapeAttr(LOCALE) + '" />',
    '<meta property="og:url" content="' + escapeAttr(url) + '" />',
    '<meta property="og:title" content="' + escapeAttr(title) + '" />',
    '<meta property="og:description" content="' + escapeAttr(description) + '" />',
    '<meta property="og:image" content="' + escapeAttr(OG_IMAGE) + '" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="' + escapeAttr(title) + '" />',
    '<meta property="article:author" content="' + escapeAttr(AUTHOR) + '" />',
  ];

  if (published) {
    head.push('<meta property="article:published_time" content="' + escapeAttr(published) + '" />');
  }
  if (post.tag) {
    head.push('<meta property="article:section" content="' + escapeAttr(post.tag) + '" />');
    head.push('<meta property="article:tag" content="' + escapeAttr(post.tag) + '" />');
  }

  head.push(
    "<!-- Twitter / X -->",
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:site" content="' + escapeAttr(TWITTER) + '" />',
    '<meta name="twitter:creator" content="' + escapeAttr(TWITTER) + '" />',
    '<meta name="twitter:title" content="' + escapeAttr(title) + '" />',
    '<meta name="twitter:description" content="' + escapeAttr(description) + '" />',
    '<meta name="twitter:image" content="' + escapeAttr(OG_IMAGE) + '" />',
    '<meta name="twitter:image:alt" content="' + escapeAttr(title) + '" />',

    '<link rel="icon" href="' + FAVICON + '" />',
    '<link rel="stylesheet" href="../assets/css/tokens.css" />',
    '<link rel="stylesheet" href="../assets/css/style.css" />',

    "<script>window.POST_ID = " + JSON.stringify(id) + ";<\/script>",
    '<script defer src="../writeups.js"><\/script>',
    '<script defer src="../assets/js/markdown.js"><\/script>',
    '<script defer src="../assets/js/store.js"><\/script>',
    '<script defer src="../assets/js/post.js"><\/script>',
    '<script defer src="../assets/js/analytics.js"><\/script>',

    '<script type="application/ld+json">' + JSON.stringify(jsonLd) + "<\/script>"
  );

  return [
    "<!DOCTYPE html>",
    '<html lang="fa" dir="rtl">',
    "<head>",
    head.map((line) => "  " + line).join("\n"),
    "</head>",
    "<body>",
    "",
    '  <header class="header">',
    '    <div class="container header__inner">',
    '      <nav class="nav">',
    '        <a class="nav__link" href="../index.html">خانه</a>',
    '        <a class="nav__link" href="../index.html#writeups">رایت‌آپ‌ها</a>',
    '        <a class="nav__link" href="../projects.html">پروژه‌ها</a>',
    "      </nav>",
    "    </div>",
    "  </header>",
    "",
    '  <main class="container">',
    '    <article class="article" data-article></article>',
    "  </main>",
    "",
    '  <footer class="footer">',
    '    <div class="container footer__inner">',
    "      <span>\u00a9 <span data-year></span> — " + escapeAttr(AUTHOR) + "</span>",
    '      <a href="../index.html">بازگشت به فهرست ←</a>',
    "    </div>",
    "  </footer>",
    "",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/* ---------- sitemap ---------- */
function buildSitemap(validPosts) {
  const entries = [
    { loc: SITE_URL + "/", priority: "1.0" },
    { loc: SITE_URL + "/projects.html", priority: "0.6" },
  ];

  validPosts.forEach((post) => {
    entries.push({
      loc: SITE_URL + "/w/" + safeId(post.id) + ".html",
      lastmod: toIsoDate(post),
      priority: "0.8",
    });
  });

  const body = entries
    .map((entry) => {
      const lines = ["  <url>", "    <loc>" + escapeAttr(entry.loc) + "</loc>"];
      if (entry.lastmod) lines.push("    <lastmod>" + entry.lastmod + "</lastmod>");
      lines.push("    <priority>" + entry.priority + "</priority>", "  </url>");
      return lines.join("\n");
    })
    .join("\n");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    "\n</urlset>\n"
  );
}

/* ---------- اجرا ---------- */
function main() {
  const validPosts = posts.filter((post) => {
    if (!safeId(post.id)) {
      console.warn("skipped post with unusable id:", post.id);
      return false;
    }
    return true;
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });

  /* صفحه‌های رایت‌آپ‌های حذف‌شده باید پاک شوند، وگرنه روی سایت می‌مانند */
  const expected = new Set(validPosts.map((post) => safeId(post.id) + ".html"));
  let removed = 0;

  fs.readdirSync(OUT_DIR).forEach((file) => {
    if (file.endsWith(".html") && !expected.has(file)) {
      fs.unlinkSync(path.join(OUT_DIR, file));
      removed += 1;
      console.log("removed  w/" + file);
    }
  });

  validPosts.forEach((post) => {
    const file = path.join(OUT_DIR, safeId(post.id) + ".html");
    fs.writeFileSync(file, buildPostPage(post), "utf8");
    console.log("wrote    w/" + path.basename(file) + "  —  " + post.title);
  });

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap(validPosts), "utf8");
  console.log("wrote    sitemap.xml");

  console.log(
    "\ndone: " + validPosts.length + " page(s), " + removed + " removed."
  );
}

main();
