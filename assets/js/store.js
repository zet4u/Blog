/* ============================================================
   store.js — تنها لایه‌ی داده

   دو لایه دارد:
   1) پایه‌ی منتشرشده: فایل writeups.js (window.WRITEUPS) —
      همان چیزی که برای همه روی سایت دیده می‌شود.
   2) تغییرات منتشرنشده: localStorage (یا حافظه‌ی موقت اگر مرورگر
      ذخیره‌سازی را بسته باشد) — فقط برای پیش‌نمایش همان مرورگر.

   چرخه‌ی انتشار: پنل → «انتشار روی سایت» → دانلود writeups.js →
   جایگزینی در پوشه‌ی سایت. این روش حتی با ذخیره‌سازیِ کاملاً بسته
   هم کار می‌کند.

   قالب هر نوشته:
   { id, title, tag, date, excerpt, body, readingTime, updatedAt }
   ============================================================ */

window.Store = (function () {
  "use strict";

  var STORAGE_KEY = "ali-writeups";

  /* ---------- تشخیص قابلیت ذخیره‌سازی ---------- */
  function detectPersistence() {
    try {
      var probe = "__ali_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch (error) {
      return false;
    }
  }

  var persistent = detectPersistence();
  var memoryFallback = []; /* وقتی localStorage در دسترس نیست */

  /* ---------- لایه‌ی منتشرشده (فایل) ---------- */
  function filePosts() {
    return Array.isArray(window.WRITEUPS) ? window.WRITEUPS : [];
  }

  /* ---------- لایه‌ی منتشرنشده (مرورگر) ---------- */
  function readOverlay() {
    if (!persistent) return memoryFallback;

    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeOverlay(posts) {
    if (!persistent) {
      memoryFallback = posts;
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (error) {
      persistent = false;
      memoryFallback = posts;
    }
  }

  /** مجموعه‌ی کاری: تغییرات منتشرنشده اگر هست، وگرنه داده‌ی فایل */
  function workingSet() {
    var overlay = readOverlay();
    return overlay.length ? overlay.slice() : filePosts().slice();
  }

  /* ---------- کمک‌ابزارها ---------- */
  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function todayLabel() {
    try {
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date());
    } catch (error) {
      return "";
    }
  }

  /** تخمین زمان مطالعه بر اساس تعداد کلمات */
  function readingTime(body) {
    var words = String(body || "")
      .replace(/[#>*_`\-\]\[()]/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    var minutes = Math.max(1, Math.ceil(words / 180));
    try {
      return new Intl.NumberFormat("fa-IR").format(minutes) + " دقیقه مطالعه";
    } catch (error) {
      return minutes + " دقیقه مطالعه";
    }
  }

  /** خلاصه‌ی خودکار از روی متن مارک‌داون */
  function autoExcerpt(body, maxLength) {
    var plain = String(body || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[#>*_`\-]/g, " ")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    if (plain.length <= maxLength) return plain;
    return plain.slice(0, maxLength).trim() + "…";
  }

  /* ---------- رابط عمومی ---------- */

  function isPersistent() {
    return persistent;
  }

  /** آیا تغییر منتشرنشده وجود دارد؟ */
  function hasOverlay() {
    return readOverlay().length > 0;
  }

  /** همه‌ی نوشته‌ها، تازه‌ترین اول */
  function list() {
    return workingSet().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  function find(id) {
    var matches = workingSet().filter(function (post) {
      return post.id === id;
    });
    return matches[0] || null;
  }

  /** افزودن یا ویرایش — روی لایه‌ی منتشرنشده */
  function save(input) {
    var posts = workingSet();
    var post = {
      id: input.id || createId(),
      title: (input.title || "").trim() || "بدون عنوان",
      tag: (input.tag || "").trim(),
      date: (input.date || "").trim() || todayLabel(),
      excerpt: (input.excerpt || "").trim() || autoExcerpt(input.body, 130),
      body: input.body || "",
      readingTime: readingTime(input.body),
      updatedAt: Date.now(),
    };

    var index = posts.findIndex(function (item) {
      return item.id === post.id;
    });

    if (index >= 0) posts[index] = post;
    else posts.push(post);

    writeOverlay(posts);
    return post;
  }

  function remove(id) {
    writeOverlay(
      workingSet().filter(function (post) {
        return post.id !== id;
      })
    );
  }

  /* ---------- انتشار ---------- */

  /** متن کامل فایل writeups.js برای دانلود و جایگزینی */
  function publishText() {
    return (
      "/* این فایل داده‌ی منتشرشده‌ی سایت است.\n" +
      "   از پنل مدیریت با دکمه‌ی «انتشار روی سایت» دانلود و اینجا جایگزین می‌شود. */\n" +
      "window.WRITEUPS = " +
      JSON.stringify(list(), null, 2) +
      ";\n"
    );
  }

  /** بعد از دانلود فایل انتشار، لایه‌ی موقت پاک می‌شود */
  function afterPublish() {
    writeOverlay([]);
  }

  /* ---------- پشتیبان‌گیری JSON ---------- */

  function exportJson() {
    return JSON.stringify(list(), null, 2);
  }

  function importJson(text) {
    var incoming = JSON.parse(text);
    if (!Array.isArray(incoming)) throw new Error("قالب فایل درست نیست.");

    incoming.forEach(function (post) {
      save(post);
    });
    return incoming.length;
  }

  return {
    isPersistent: isPersistent,
    hasOverlay: hasOverlay,
    list: list,
    find: find,
    save: save,
    remove: remove,
    publishText: publishText,
    afterPublish: afterPublish,
    exportJson: exportJson,
    importJson: importJson,
    todayLabel: todayLabel,
  };
})();
