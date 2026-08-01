/* ============================================================
   post.js — صفحه‌ی یک نوشته (post.html?id=...)
   شامل دکمه‌های کپی لینک و کپی متن رایت‌آپ
   ============================================================ */

(function () {
  "use strict";

  var escapeHtml = window.Markdown.escapeHtml;

  function $(selector) {
    return document.querySelector(selector);
  }

  function currentId() {
    return new URLSearchParams(window.location.search).get("id");
  }

  /* ---------- کپی به حافظه (با پشتیبان برای file://) ---------- */
  function copyToClipboard(text, button) {
    function done() {
      var original = button.textContent;
      button.textContent = "کپی شد ✓";
      setTimeout(function () {
        button.textContent = original;
      }, 1500);
    }

    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        done();
      } catch (error) {
        /* کپی نشد */
      }
      document.body.removeChild(area);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function renderNotFound() {
    var container = $("[data-article]");
    if (!container) return;

    container.innerHTML = [
      '<div class="empty">',
      '  <p class="empty__title">این نوشته پیدا نشد</p>',
      '  <p class="empty__text">شاید حذف شده یا لینک اشتباه است.</p>',
      '  <p class="empty__text"><a class="button" href="index.html">بازگشت به صفحه‌ی اصلی</a></p>',
      "</div>",
    ].join("");
  }

  function renderPost(post) {
    document.title = post.title;

    var meta = [];
    if (post.tag) meta.push('<span class="tag">' + escapeHtml(post.tag) + "</span>");
    meta.push("<span>" + escapeHtml(post.date) + "</span>");
    if (post.readingTime) meta.push("<span>" + escapeHtml(post.readingTime) + "</span>");

    $("[data-article]").innerHTML = [
      '<h1 class="article__title">' + escapeHtml(post.title) + "</h1>",
      '<div class="article__meta">' + meta.join("") + "</div>",
      '<div class="article__actions">',
      '  <button class="button" type="button" data-copy-link>کپی لینک</button>',
      '  <button class="button" type="button" data-copy-text>کپی متن رایت‌آپ</button>',
      "</div>",
      '<div class="prose">' + window.Markdown.render(post.body) + "</div>",
    ].join("");

    $("[data-copy-link]").addEventListener("click", function (event) {
      copyToClipboard(window.location.href, event.target);
    });

    $("[data-copy-text]").addEventListener("click", function (event) {
      copyToClipboard(post.title + "\n\n" + post.body, event.target);
    });
  }

  function init() {
    var post = window.Store.find(currentId());
    if (post) renderPost(post);
    else renderNotFound();

    var year = $("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
