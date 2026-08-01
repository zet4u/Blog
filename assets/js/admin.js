/* ============================================================
   admin.js — پنل مدیریت نوشته‌ها
   قابلیت‌ها: تایپ مستقیم مارک‌داون، وارد کردن فایل .md،
   پیش‌نمایش زنده، ویرایش، حذف، و پشتیبان‌گیری JSON.
   ============================================================ */

(function () {
  "use strict";

  var Store = window.Store;
  var Markdown = window.Markdown;

  /* ---------- ارجاع به عناصر ---------- */
  var form = document.querySelector("[data-form]");
  var fields = {
    id: document.querySelector("[data-field-id]"),
    title: document.querySelector("[data-field-title]"),
    tag: document.querySelector("[data-field-tag]"),
    date: document.querySelector("[data-field-date]"),
    excerpt: document.querySelector("[data-field-excerpt]"),
    body: document.querySelector("[data-field-body]"),
  };
  var listNode = document.querySelector("[data-admin-list]");
  var previewNode = document.querySelector("[data-preview]");
  var feedbackNode = document.querySelector("[data-feedback]");
  var formTitleNode = document.querySelector("[data-form-title]");
  var searchNode = document.querySelector("[data-search]");
  var wordCountNode = document.querySelector("[data-wordcount]");
  var publishNode = document.querySelector("[data-publish]");
  var noticeNode = document.querySelector("[data-notice]");

  /* ---------- کمک‌ابزارها ---------- */
  function say(message) {
    if (!feedbackNode) return;
    feedbackNode.textContent = message;
    setTimeout(function () {
      feedbackNode.textContent = "";
    }, 2600);
  }

  function readForm() {
    return {
      id: fields.id.value || "",
      title: fields.title.value,
      tag: fields.tag.value,
      date: fields.date.value,
      excerpt: fields.excerpt.value,
      body: fields.body.value,
    };
  }

  function fillForm(post) {
    fields.id.value = post.id || "";
    fields.title.value = post.title || "";
    fields.tag.value = post.tag || "";
    fields.date.value = post.date || Store.todayLabel();
    fields.excerpt.value = post.excerpt || "";
    fields.body.value = post.body || "";

    formTitleNode.textContent = post.id ? "ویرایش نوشته" : "نوشته‌ی جدید";
    renderPreview();
  }

  function resetForm() {
    fillForm({});
  }

  /* ---------- شمارش کلمات ---------- */
  function updateWordCount() {
    if (!wordCountNode) return;

    var words = fields.body.value
      .replace(/[#>*_`\-\]\[()]/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;

    wordCountNode.textContent = words
      ? new Intl.NumberFormat("fa-IR").format(words) + " کلمه"
      : "";
  }

  /* ---------- پیش‌نمایش زنده ---------- */
  function renderPreview() {
    if (previewNode) previewNode.innerHTML = Markdown.render(fields.body.value);
    updateWordCount();
  }

  /* ---------- لیست نوشته‌ها ---------- */
  function listTemplate(post) {
    return [
      '<li class="admin-post">',
      "  <span>",
      '    <span class="admin-post__title">' + Markdown.escapeHtml(post.title) + "</span>",
      '    <span class="admin-post__meta">' +
        Markdown.escapeHtml(post.date) +
        (post.tag ? " · " + Markdown.escapeHtml(post.tag) : "") +
        "</span>",
      "  </span>",
      '  <span class="admin-post__actions">',
      '    <button class="link-button" data-edit="' + post.id + '">ویرایش</button>',
      '    <button class="link-button link-button--danger" data-delete="' +
        post.id +
        '">حذف</button>',
      "  </span>",
      "</li>",
    ].join("");
  }

  function renderList() {
    var query = searchNode ? searchNode.value.trim() : "";
    var posts = Store.list().filter(function (post) {
      return (
        !query ||
        post.title.indexOf(query) >= 0 ||
        (post.tag && post.tag.indexOf(query) >= 0)
      );
    });

    listNode.innerHTML = posts.length
      ? posts.map(listTemplate).join("")
      : '<li class="admin-post__meta">' +
        (query ? "چیزی پیدا نشد." : "هنوز چیزی ذخیره نشده.") +
        "</li>";

    updateNotice();
  }

  /* ---------- رویدادها ---------- */
  function handleSubmit(event) {
    event.preventDefault();

    if (!fields.title.value.trim() || !fields.body.value.trim()) {
      say("عنوان و متن را پر کن.");
      return;
    }

    var saved = Store.save(readForm());
    if (!saved) {
      say("ذخیره نشد — مرورگر اجازه‌ی ذخیره‌سازی نداد.");
      return;
    }

    resetForm();
    renderList();
    say(
      Store.isPersistent()
        ? "ذخیره شد ✓"
        : "ذخیره شد، ولی فقط تا بستن این تب (مرورگر ذخیره‌سازی را بسته است)"
    );
  }

  function handleListClick(event) {
    var editId = event.target.getAttribute("data-edit");
    var deleteId = event.target.getAttribute("data-delete");

    if (editId) {
      var post = Store.find(editId);
      if (post) {
        fillForm(post);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (deleteId && window.confirm("این نوشته حذف شود؟")) {
      Store.remove(deleteId);
      if (fields.id.value === deleteId) resetForm();
      renderList();
      say("حذف شد.");
    }
  }

  /** خواندن فایل مارک‌داون: خط عنوان (# ...) به عنوان تیتر برداشته می‌شود */
  function handleMarkdownFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var firstHeading = text.match(/^#\s+(.+)$/m);

      if (firstHeading && !fields.title.value.trim()) {
        fields.title.value = firstHeading[1].trim();
        text = text.replace(firstHeading[0], "").replace(/^\n+/, "");
      }

      fields.body.value = text;
      renderPreview();
      say("فایل خوانده شد: " + file.name);
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  }

  /** دانلود پشتیبان JSON */
  function handleExport() {
    var blob = new Blob([Store.exportJson()], { type: "application/json" });
    var link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "writeups-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleImport(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var count = Store.importJson(String(reader.result));
        renderList();
        say(count + " نوشته بازگردانده شد.");
      } catch (error) {
        say("فایل معتبر نیست.");
      }
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  }

  /* ---------- انتشار ---------- */
  function updateNotice() {
    if (noticeNode) {
      noticeNode.style.display = Store.hasOverlay() ? "block" : "none";
    }
  }

  function handlePublish() {
    var blob = new Blob([Store.publishText()], { type: "text/javascript" });
    var link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "writeups.js";
    link.click();
    URL.revokeObjectURL(link.href);

    Store.afterPublish();
    updateNotice();
    say("فایل انتشار دانلود شد — writeups.js را در پوشه‌ی سایت جایگزین کن.");
  }

  /* ---------- راه‌اندازی ---------- */
  function init() {
    if (!Store.isPersistent()) {
      say("هشدار: مرورگر ذخیره‌سازی را بسته؛ نوشته‌ها فقط تا بستن تب می‌مانند.");
    }

    form.addEventListener("submit", handleSubmit);
    listNode.addEventListener("click", handleListClick);
    fields.body.addEventListener("input", renderPreview);
    if (searchNode) searchNode.addEventListener("input", renderList);
    if (publishNode) publishNode.addEventListener("click", handlePublish);

    document
      .querySelector("[data-md-file]")
      .addEventListener("change", handleMarkdownFile);
    document
      .querySelector("[data-import-file]")
      .addEventListener("change", handleImport);
    document.querySelector("[data-export]").addEventListener("click", handleExport);
    document.querySelector("[data-reset]").addEventListener("click", resetForm);

    resetForm();
    renderList();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
