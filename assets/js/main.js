/* ============================================================
   main.js — صفحه‌ی اصلی
   داده از config.js (معرفی) و store.js (نوشته‌ها) می‌آید.
   ============================================================ */

(function () {
  "use strict";

  var config = window.SITE_CONFIG;
  var escapeHtml = window.Markdown.escapeHtml;

  function $(selector) {
    return document.querySelector(selector);
  }

  function setText(selector, text) {
    var node = $(selector);
    if (node) node.textContent = text;
  }

  /* ---------- معرفی ---------- */
  function renderProfile() {
    var profile = config.profile;
    setText("[data-profile-name]", profile.name);
    setText("[data-profile-tagline]", profile.tagline);
    setText("[data-profile-bio]", profile.bio);
    setText("[data-profile-contact]", profile.contactNote);
    setText("[data-profile-contact-tail]", profile.contactNoteTail);
  }

  /* ---------- لینک‌ها ---------- */
  function linkMarkup(item) {
    return (
      '<a href="' +
      escapeHtml(item.url) +
      '" target="_blank" rel="noopener">' +
      escapeHtml(item.label) +
      "</a>"
    );
  }

  function renderSocials() {
    /* فوتر — همه‌ی لینک‌ها */
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-socials]"),
      function (node) {
        node.innerHTML = config.socials.map(linkMarkup).join("");
      }
    );

    /* جمله‌ی تماس هیرو — فقط لینک‌های inContact (تلگرام و توییتر) */
    var inline = $("[data-socials-inline]");
    if (inline) {
      inline.innerHTML = config.socials
        .filter(function (item) {
          return item.inContact;
        })
        .map(linkMarkup)
        .join(" یا ");
    }
  }

  /* ---------- نوشته‌ها ---------- */
  function postTemplate(post) {
    var meta = [];
    if (post.tag) meta.push('<span class="tag">' + escapeHtml(post.tag) + "</span>");
    if (post.readingTime) meta.push("<span>" + escapeHtml(post.readingTime) + "</span>");

    return [
      /* لینک به صفحه‌ی اختصاصی رایت‌آپ (متاتگ مخصوص خودش را دارد).
         اگر هنوز ساخته نشده باشد، 404.html خودکار به post.html?id= می‌برد. */
      '<a class="post" href="w/' + encodeURIComponent(post.id) + '.html">',
      '  <span class="post__main">',
      '    <h3 class="post__title">' + escapeHtml(post.title) + "</h3>",
      '    <p class="post__excerpt">' + escapeHtml(post.excerpt) + "</p>",
      '    <span class="post__meta">' + meta.join("") + "</span>",
      "  </span>",
      '  <span class="post__date">' + escapeHtml(post.date) + "</span>",
      "</a>",
    ].join("");
  }

  /* حالت خالی — فقط برای بازدیدکننده */
  function emptyTemplate() {
    return [
      '<div class="empty">',
      '  <p class="empty__title">به‌زودی…</p>',
      '  <p class="empty__text">اولین رایت‌آپ و یادداشت‌های مسیر همین‌جا منتشر می‌شوند.</p>',
      "</div>",
    ].join("");
  }

  function renderPosts() {
    var container = $("[data-posts]");
    if (!container) return;

    var posts = window.Store.list();
    container.innerHTML = posts.length
      ? posts.map(postTemplate).join("")
      : emptyTemplate();

    setText("[data-posts-count]", posts.length ? posts.length + " نوشته" : "");
  }

  /* ---------- پروژه‌ها ---------- */
  function projectTemplate(project) {
    var tags = (project.tags || [])
      .map(function (tag) {
        return '<span class="tag">' + escapeHtml(tag) + "</span>";
      })
      .join("");

    var dot = project.accent
      ? '<span class="project__dot" style="background:' +
        escapeHtml(project.accent) +
        '"></span>'
      : "";

    /* دکمه‌ی «اجرا» فقط وقتی می‌آید که demo داده شده باشد */
    var demoButton = project.demo
      ? '<a class="project__btn project__btn--primary" href="' +
        escapeHtml(project.demo) +
        '" target="_blank" rel="noopener">اجرای آنلاین</a>'
      : "";

    return [
      '<article class="project">',
      '  <h3 class="project__name">' + dot + escapeHtml(project.name) + "</h3>",
      '  <p class="project__desc">' + escapeHtml(project.desc) + "</p>",
      '  <div class="project__tags">' + tags + "</div>",
      '  <div class="project__actions">',
      "    " + demoButton,
      '    <a class="project__btn" href="' +
        escapeHtml(project.url) +
        '" target="_blank" rel="noopener">مشاهده‌ی کد در گیت‌هاب ↗</a>',
      "  </div>",
      "</article>",
    ].join("");
  }

  function renderProjects() {
    var container = $("[data-projects]");
    if (!container) return;

    /* از ProjectStore خوانده می‌شود تا تغییرات منتشرنشده‌ی پنل هم دیده شود */
    var projects = window.ProjectStore
      ? window.ProjectStore.list()
      : window.PROJECTS || [];
    var section = $("#projects");

    /* اگر هیچ پروژه‌ای نیست، کل بخش پنهان می‌شود */
    if (!projects.length) {
      if (section) section.hidden = true;
      return;
    }

    container.innerHTML = projects.map(projectTemplate).join("");
    setText("[data-projects-count]", projects.length + " پروژه");
  }

  function init() {
    renderProfile();
    renderSocials();
    renderPosts();
    renderProjects();
    setText("[data-year]", new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", init);
})();
