/* ============================================================
   markdown.js — مبدل کوچک مارک‌داون به HTML
   بدون وابستگی خارجی. پوشش: عنوان، لیست، نقل‌قول،
   کد بلاک، خط جداکننده، لینک، تصویر، بولد، ایتالیک و کد درون‌خطی.
   ============================================================ */

window.Markdown = (function () {
  "use strict";

  function escapeHtml(text) {
    var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
    return String(text).replace(/[&<>"]/g, function (char) {
      return map[char];
    });
  }

  /** قالب‌بندی‌های درون‌خطی روی متنی که قبلاً escape شده */
  function inline(text) {
    return text
      .replace(/`([^`]+)`/g, '<code class="mono">$1</code>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" loading="lazy" />')
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      )
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  }

  /** تبدیل متن مارک‌داون به HTML امن */
  function render(source) {
    var lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    var html = [];
    var listType = null; // "ul" | "ol" | null
    var inCode = false;

    function closeList() {
      if (listType) {
        html.push("</" + listType + ">");
        listType = null;
      }
    }

    function openList(type) {
      if (listType !== type) {
        closeList();
        html.push("<" + type + ">");
        listType = type;
      }
    }

    lines.forEach(function (rawLine) {
      var line = rawLine.trimEnd();

      /* کد بلاک */
      if (/^```/.test(line)) {
        if (inCode) {
          html.push("</code></pre>");
          inCode = false;
        } else {
          closeList();
          html.push('<pre class="code" dir="ltr"><code>');
          inCode = true;
        }
        return;
      }
      if (inCode) {
        html.push(escapeHtml(rawLine));
        return;
      }

      /* خط خالی */
      if (!line.trim()) {
        closeList();
        return;
      }

      var safe = escapeHtml(line);

      /* خط جداکننده */
      if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
        closeList();
        html.push("<hr />");
        return;
      }

      /* عناوین */
      var heading = safe.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        closeList();
        var level = heading[1].length + 1; // # → h2 تا h5
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        return;
      }

      /* نقل‌قول */
      if (/^&gt;\s?/.test(safe)) {
        closeList();
        html.push("<blockquote>" + inline(safe.replace(/^&gt;\s?/, "")) + "</blockquote>");
        return;
      }

      /* لیست نقطه‌ای */
      if (/^[-*]\s+/.test(safe)) {
        openList("ul");
        html.push("<li>" + inline(safe.replace(/^[-*]\s+/, "")) + "</li>");
        return;
      }

      /* لیست شماره‌دار */
      if (/^\d+[.)]\s+/.test(safe)) {
        openList("ol");
        html.push("<li>" + inline(safe.replace(/^\d+[.)]\s+/, "")) + "</li>");
        return;
      }

      /* پاراگراف */
      closeList();
      html.push("<p>" + inline(safe) + "</p>");
    });

    if (inCode) html.push("</code></pre>");
    closeList();

    return html.join("\n");
  }

  return { render: render, escapeHtml: escapeHtml };
})();
