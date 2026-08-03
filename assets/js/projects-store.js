/* ============================================================
   projects-store.js — لایه‌ی داده‌ی پروژه‌ها

   دقیقاً همان الگوی store.js را دارد، فقط برای پروژه‌ها:

   1) پایه‌ی منتشرشده: فایل projects.js (window.PROJECTS)
   2) تغییرات منتشرنشده: localStorage — فقط در همین مرورگر

   قاعده‌ی کلیدی همان است: پیش‌نویس فقط وقتی پاک می‌شود که
   محتوای projects.js واقعاً با آن یکی شده باشد (مقایسه‌ی امضا).
   دانلود کردن فایل به تنهایی کافی نیست — وگرنه پروژه‌ی
   حذف‌شده دوباره برمی‌گردد.

   قالب هر پروژه:
   { id, name, desc, url, demo, tags: [], accent }
   ============================================================ */

window.ProjectStore = (function () {
  "use strict";

  var STORAGE_KEY = "ali-projects";
  var SCHEMA = 1;

  /* ---------- تشخیص قابلیت ذخیره‌سازی ---------- */
  function detectPersistence() {
    try {
      var probe = "__ali_projects_probe__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch (error) {
      return false;
    }
  }

  var persistent = detectPersistence();
  var memoryEnvelope = null;

  /* ---------- کمک‌ابزارها ---------- */

  function createId() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** آرایه‌ی برچسب‌ها — هم آرایه قبول می‌کند هم متن با ویرگول */
  function toTags(value) {
    var raw = Array.isArray(value) ? value : String(value || "").split(/[,،\n]/);
    return raw
      .map(function (tag) {
        return String(tag).trim();
      })
      .filter(Boolean);
  }

  /** یکدست‌سازی یک پروژه — همیشه id دارد */
  function normalize(project) {
    var item = project || {};
    return {
      id: String(item.id || "").trim() || createId(),
      name: String(item.name || "").trim() || "بدون نام",
      desc: String(item.desc || "").trim(),
      url: String(item.url || "").trim(),
      demo: String(item.demo || "").trim(),
      tags: toTags(item.tags),
      accent: String(item.accent || "").trim(),
    };
  }

  /* ---------- لایه‌ی منتشرشده (فایل) ---------- */
  function fileProjects() {
    return (Array.isArray(window.PROJECTS) ? window.PROJECTS : []).map(normalize);
  }

  /* ---------- امضای محتوا ---------- */

  /**
   * امضای یکتای یک مجموعه پروژه.
   * برخلاف نوشته‌ها، اینجا ترتیب مهم است (ترتیب نمایش)،
   * پس مرتب‌سازی نمی‌شود.
   */
  function signature(projects) {
    return (Array.isArray(projects) ? projects : [])
      .map(function (project) {
        return [
          project.id,
          project.name,
          project.desc,
          project.url,
          project.demo,
          (project.tags || []).join(","),
          project.accent,
        ].join("\u0001");
      })
      .join("\u0002");
  }

  /** حذف رکوردهای با شناسه‌ی تکراری — اولی می‌ماند */
  function dedupeById(projects) {
    var seen = {};
    return projects.filter(function (project) {
      var key = String(project.id);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  /* ---------- لایه‌ی پیش‌نویس ---------- */

  function rawEnvelope() {
    if (!persistent) {
      return memoryEnvelope || { v: SCHEMA, active: false, projects: [] };
    }

    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.projects)) {
        return {
          v: SCHEMA,
          active: parsed.active !== false,
          projects: parsed.projects.map(normalize),
        };
      }
    } catch (error) {
      /* داده‌ی خراب — نادیده گرفته می‌شود */
    }

    return { v: SCHEMA, active: false, projects: [] };
  }

  function writeEnvelope(envelope) {
    var payload = {
      v: SCHEMA,
      active: envelope.active !== false,
      projects: dedupeById(
        (Array.isArray(envelope.projects) ? envelope.projects : []).map(normalize)
      ),
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
   * اگر محتوای پیش‌نویس دقیقاً برابر فایل باشد، یعنی
   * جایگزینی انجام شده و پیش‌نویس خودکار پاک می‌شود.
   */
  function readEnvelope() {
    var envelope = rawEnvelope();
    if (!envelope.active) return envelope;

    if (signature(envelope.projects) === signature(fileProjects())) {
      var synced = { v: SCHEMA, active: false, projects: [] };
      writeEnvelope(synced);
      return synced;
    }

    return envelope;
  }

  function workingSet() {
    var envelope = readEnvelope();
    return dedupeById(
      envelope.active ? envelope.projects.slice() : fileProjects()
    );
  }

  function commit(projects) {
    return writeEnvelope({ active: true, projects: projects });
  }

  function indexOfId(projects, id) {
    for (var i = 0; i < projects.length; i += 1) {
      if (String(projects[i].id) === String(id)) return i;
    }
    return -1;
  }

  /* ---------- رابط عمومی ---------- */

  function isPersistent() {
    return persistent;
  }

  function hasOverlay() {
    return readEnvelope().active === true;
  }

  /** همه‌ی پروژه‌ها به ترتیب نمایش */
  function list() {
    return workingSet();
  }

  function find(id) {
    if (!id) return null;
    var matches = workingSet().filter(function (project) {
      return String(project.id) === String(id);
    });
    return matches[0] || null;
  }

  /** افزودن یا ویرایش — جدیدها به انتها اضافه می‌شوند */
  function save(input) {
    var projects = workingSet();
    var project = normalize(input);
    var index = indexOfId(projects, project.id);

    if (index >= 0) projects[index] = project;
    else projects.push(project);

    commit(projects);
    return project;
  }

  function remove(id) {
    var before = workingSet();
    var after = before.filter(function (project) {
      return String(project.id) !== String(id);
    });

    if (after.length === before.length) return false;

    commit(after);
    return true;
  }

  /** جابه‌جایی در ترتیب نمایش — delta مثلاً 1- یا 1+ */
  function move(id, delta) {
    var projects = workingSet();
    var index = indexOfId(projects, id);
    var target = index + delta;

    if (index < 0 || target < 0 || target >= projects.length) return false;

    var moved = projects[index];
    projects[index] = projects[target];
    projects[target] = moved;

    commit(projects);
    return true;
  }

  /* ---------- انتشار ---------- */

  /** متن کامل فایل projects.js برای دانلود و جایگزینی */
  function publishText() {
    /* فیلدهای خالی در خروجی نمی‌آیند تا فایل تمیز بماند */
    var clean = list().map(function (project) {
      var item = {
        id: project.id,
        name: project.name,
        desc: project.desc,
        url: project.url,
      };
      if (project.demo) item.demo = project.demo;
      if (project.tags.length) item.tags = project.tags;
      if (project.accent) item.accent = project.accent;
      return item;
    });

    return (
      "/* این فایل داده‌ی منتشرشده‌ی پروژه‌هاست.\n" +
      "   از پنل مدیریت با دکمه‌ی «انتشار پروژه‌ها» دانلود و اینجا جایگزین می‌شود. */\n" +
      "window.PROJECTS = " +
      JSON.stringify(clean, null, 2) +
      ";\n"
    );
  }

  /** تعداد پروژه‌های فایل منتشرشده */
  function publishedCount() {
    return fileProjects().length;
  }

  /** دور ریختن تغییرات منتشرنشده */
  function discardChanges() {
    writeEnvelope({ active: false, projects: [] });
  }

  return {
    isPersistent: isPersistent,
    hasOverlay: hasOverlay,
    list: list,
    find: find,
    save: save,
    remove: remove,
    move: move,
    publishText: publishText,
    publishedCount: publishedCount,
    discardChanges: discardChanges,
  };
})();
