/* ============================================================
   store.js — تنها لایه‌ی داده

   دو لایه دارد:
   1) پایه‌ی منتشرشده: فایل writeups.js (window.WRITEUPS) —
      همان چیزی که برای همه روی سایت دیده می‌شود.
   2) تغییرات منتشرنشده (پیش‌نویس): localStorage — فقط در همین مرورگر.

   پیش‌نویس در یک پاکت ذخیره می‌شود:
       { v: 3, active: true, posts: [...] }

   قاعده‌ی کلیدی هماهنگ‌سازی:
   پیش‌نویس فقط و فقط وقتی پاک می‌شود که محتوای writeups.js
   واقعاً با آن یکی شده باشد (مقایسه‌ی امضا). دانلود کردنِ فایل
   به تنهایی پیش‌نویس را پاک نمی‌کند — چون ممکن است کاربر هنوز
   فایل را جایگزین نکرده باشد. این دقیقاً همان چیزی بود که قبلاً
   باعث می‌شد نوشته‌ی حذف‌شده دوباره برگردد و نسخه‌ی تکراری بسازد.

   قالب هر نوشته:
   { id, title, tag, date, excerpt, body, readingTime, updatedAt }
   ============================================================ */

window.Store = (function () {
  "use strict";

  var STORAGE_KEY = "ali-writeups";
  var SCHEMA = 3;

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
  var memoryEnvelope = null; /* جایگزین وقتی localStorage بسته است */

  /* ---------- لایه‌ی منتشرشده (فایل) ---------- */
  function filePosts() {
    return Array.isArray(window.WRITEUPS) ? window.WRITEUPS.slice() : [];
  }

  /* ---------- امضای محتوا ---------- */

  /**
   * امضای یکتای یک مجموعه نوشته.
   * فقط شناسه و محتوای مؤثر را در نظر می‌گیرد، نه ترتیب را.
   */
  function signature(posts) {
    return (Array.isArray(posts) ? posts : [])
      .map(function (post) {
        return [
          post.id,
          post.title,
          post.tag,
          post.date,
          post.excerpt,
          post.body,
        ].join("\u0001");
      })
      .sort()
      .join("\u0002");
  }

  /* ---------- پاک‌سازی ---------- */

  /** حذف رکوردهای با شناسه‌ی تکراری — تازه‌ترین می‌ماند */
  function dedupeById(posts) {
    var seen = {};
    var result = [];

    posts.forEach(function (post) {
      var key = String(post.id);
      if (!(key in seen)) {
        seen[key] = result.length;
        result.push(post);
        return;
      }

      var existing = result[seen[key]];
      if ((post.updatedAt || 0) > (existing.updatedAt || 0)) {
        result[seen[key]] = post;
      }
    });

    return result;
  }

  /* ---------- لایه‌ی پیش‌نویس ---------- */

  function rawEnvelope() {
    if (!persistent) {
      return memoryEnvelope || { v: SCHEMA, active: false, posts: [] };
    }

    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));

      /* قالب پاکتی */
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.posts)) {
        return {
          v: SCHEMA,
          active: parsed.active !== false,
          posts: parsed.posts,
        };
      }

      /* قالب خیلی قدیمی: آرایه‌ی خام */
      if (Array.isArray(parsed)) {
        return { v: SCHEMA, active: parsed.length > 0, posts: parsed };
      }
    } catch (error) {
      /* داده‌ی خراب — نادیده گرفته می‌شود */
    }

    return { v: SCHEMA, active: false, posts: [] };
  }

  function writeEnvelope(envelope) {
    var payload = {
      v: SCHEMA,
      active: envelope.active !== false,
      posts: dedupeById(Array.isArray(envelope.posts) ? envelope.posts : []),
    };

    if (!persistent) {
      memoryEnvelope = payload;
      return true;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      persistent = false;
      memoryEnvelope = payload;
      return false;
    }
  }

  /**
   * پاکتِ هماهنگ‌شده.
   * اگر محتوای پیش‌نویس دقیقاً برابر فایل باشد، یعنی جایگزینی
   * انجام شده و دیگر نیازی به پیش‌نویس نیست — خودکار پاک می‌شود.
   */
  function readEnvelope() {
    var envelope = rawEnvelope();
    if (!envelope.active) return envelope;

    if (signature(envelope.posts) === signature(filePosts())) {
      var synced = { v: SCHEMA, active: false, posts: [] };
      writeEnvelope(synced);
      return synced;
    }

    return envelope;
  }

  /**
   * مجموعه‌ی کاری.
   * اگر پیش‌نویس فعال باشد همان ملاک است — حتی اگر خالی باشد.
   * وگرنه داده‌ی منتشرشده‌ی فایل.
   */
  function workingSet() {
    var envelope = readEnvelope();
    return dedupeById(envelope.active ? envelope.posts.slice() : filePosts());
  }

  /** ذخیره‌ی مجموعه‌ی کاری به عنوان پیش‌نویس فعال */
  function commit(posts) {
    return writeEnvelope({ active: true, posts: posts });
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

  /** متن ساده — از markdown.js اگر موجود باشد */
  function plain(body) {
    if (window.Markdown && window.Markdown.plainText) {
      return window.Markdown.plainText(body);
    }
    return String(body || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** تخمین زمان مطالعه بر اساس تعداد کلمات */
  function readingTime(body) {
    var words = plain(body).split(/\s+/).filter(Boolean).length;
    var minutes = Math.max(1, Math.ceil(words / 180));
    try {
      return new Intl.NumberFormat("fa-IR").format(minutes) + " دقیقه مطالعه";
    } catch (error) {
      return minutes + " دقیقه مطالعه";
    }
  }

  /** خلاصه‌ی خودکار از روی متن مارک‌داون */
  function autoExcerpt(body, maxLength) {
    var text = plain(body);
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "…";
  }

  /* ---------- رابط عمومی ---------- */

  function isPersistent() {
    return persistent;
  }

  /** آیا تغییر منتشرنشده وجود دارد؟ */
  function hasOverlay() {
    return readEnvelope().active === true;
  }

  /** همه‌ی نوشته‌ها، تازه‌ترین اول */
  function list() {
    return workingSet().sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  function find(id) {
    if (!id) return null;
    var matches = workingSet().filter(function (post) {
      return String(post.id) === String(id);
    });
    return matches[0] || null;
  }

  /**
   * نوشته‌هایی که عنوان یکسان دارند ولی شناسه‌شان فرق دارد.
   * برای هشدار در پنل مدیریت.
   */
  function duplicateTitles() {
    var byTitle = {};

    workingSet().forEach(function (post) {
      var key = String(post.title || "").trim();
      if (!key) return;
      byTitle[key] = (byTitle[key] || 0) + 1;
    });

    return Object.keys(byTitle).filter(function (title) {
      return byTitle[title] > 1;
    });
  }

  /** افزودن یا ویرایش — روی لایه‌ی پیش‌نویس */
  function save(input) {
    var posts = workingSet();

    var post = {
      id: String(input.id || "").trim() || createId(),
      title: (input.title || "").trim() || "بدون عنوان",
      tag: (input.tag || "").trim(),
      date: (input.date || "").trim() || todayLabel(),
      excerpt: (input.excerpt || "").trim() || autoExcerpt(input.body, 130),
      body: input.body || "",
      readingTime: readingTime(input.body),
      updatedAt: Date.now(),
    };

    var index = -1;
    for (var i = 0; i < posts.length; i += 1) {
      if (String(posts[i].id) === String(post.id)) {
        index = i;
        break;
      }
    }

    if (index >= 0) posts[index] = post;
    else posts.unshift(post);

    commit(posts);
    return post;
  }

  /** حذف — حتی اگر آخرین نوشته باشد */
  function remove(id) {
    var before = workingSet();
    var after = before.filter(function (post) {
      return String(post.id) !== String(id);
    });

    if (after.length === before.length) return false;

    commit(after);
    return true;
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

  /**
   * بعد از دانلود فایل انتشار.
   *
   * عمداً هیچ چیزی پاک نمی‌شود: تا وقتی کاربر writeups.js را واقعاً
   * جایگزین نکرده، پیش‌نویس باید بماند. وگرنه حذف‌ها فراموش
   * می‌شوند و نوشته‌ی پاک‌شده از روی فایل قدیمی برمی‌گردد.
   *
   * پاک‌سازی دفعه‌ی بعد که صفحه باز شود خودکار انجام می‌شود
   * (مقایسه‌ی امضا در readEnvelope).
   */
  function afterPublish() {
    return readEnvelope().active === false;
  }

  /** دور ریختن تغییرات منتشرنشده و بازگشت به داده‌ی فایل */
  function discardChanges() {
    writeEnvelope({ active: false, posts: [] });
  }

  /** تعداد نوشته‌های فایل منتشرشده — برای نمایش در پنل */
  function publishedCount() {
    return filePosts().length;
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
    duplicateTitles: duplicateTitles,
    publishText: publishText,
    publishedCount: publishedCount,
    afterPublish: afterPublish,
    discardChanges: discardChanges,
    exportJson: exportJson,
    importJson: importJson,
    todayLabel: todayLabel,
  };
})();
