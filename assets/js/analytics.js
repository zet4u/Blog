/* ============================================================
   analytics.js — Google Analytics 4

   شناسه فقط در همین یک فایل نگهداری می‌شود؛ اگر روزی عوض شد
   فقط همین خط را تغییر بده، نه تک‌تک صفحه‌ها را.
   ============================================================ */

(function () {
  "use strict";

  var MEASUREMENT_ID = "G-RL3HX0TR2B";

  /* روی فایل محلی و لوکال‌هاست آمار نفرست،
     تا بازدیدهای خودت آمار واقعی را خراب نکند */
  var host = window.location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") return;

  var loader = document.createElement("script");
  loader.async = true;
  loader.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(loader);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
})();
