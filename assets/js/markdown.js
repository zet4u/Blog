/* ============================================================
   markdown.js — مبدل مارک‌داون به HTML

   پوشش: عنوان (h1..h6)، پاراگراف، لیست نقطه‌ای و شماره‌دار با
   تودرتویی، چک‌لیست، جدول، نقل‌قول، کد بلاک با نام زبان و
   رنگ‌آمیزی، خط جداکننده، لینک، تصویر، بولد، ایتالیک،
   خط‌خورده، هایلایت و کد درون‌خطی.

   قاعده‌ی امنیتی: هر متنی که از کاربر می‌آید اول escape می‌شود،
   بعد قالب‌بندی درون‌خطی روی آن اعمال می‌گردد.
   ============================================================ */

window.Markdown = (function () {
  "use strict";

  /* ---------- ابزار پایه ---------- */

  function escapeHtml(text) {
    var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
    return String(text).replace(/[&<>"]/g, function (char) {
      return map[char];
    });
  }

  /** فقط لینک‌های بی‌خطر اجازه‌ی عبور دارند */
  function safeUrl(url) {
    var value = String(url || "").trim();
    return /^(https?:|mailto:|#|\/|\.\/|\.\.\/|[\w./?=&%-]+$)/i.test(value)
      ? value
      : "#";
  }

  /* ---------- رنگ‌آمیزی ساده‌ی کد ---------- */

  var KEYWORDS = [
    "var", "let", "const", "function", "return", "if", "else", "for", "while",
    "break", "continue", "new", "class", "extends", "import", "from", "export",
    "default", "try", "catch", "finally", "throw", "typeof", "instanceof",
    "async", "await", "this", "true", "false", "null", "undefined",
    "def", "elif", "lambda", "pass", "with", "as", "in", "not", "and", "or",
    "None", "True", "False", "print", "echo", "sudo", "apt", "cd", "ls",
    "select", "where", "insert", "update", "delete", "int", "str", "bool",
  ];

  var KEYWORD_RE = new RegExp("\\b(" + KEYWORDS.join("|") + ")\\b", "g");

  /**
   * رنگ‌آمیزی روی متنِ از قبل escape شده انجام می‌شود.
   * ابتدا رشته‌ها و کامنت‌ها با نگهدارنده کنار گذاشته می‌شوند تا
   * قواعد بعدی داخلشان دست نبرند.
   */
  /* نگهدارنده‌ها از ناحیه‌ی خصوصی یونیکد استفاده می‌کنند
     تا نه رقم باشند و نه حرف — وگرنه قواعد بعدی خودِ نگهدارنده را دستکاری می‌کنند. */
  var SLOT_BASE = 0xe000;
  var SLOT_RE = /[\ue000-\uf8ff]/g;

  function slotToken(index) {
    return String.fromCharCode(SLOT_BASE + index);
  }

  function restoreSlots(text, slots) {
    return String(text).replace(SLOT_RE, function (char) {
      var index = char.charCodeAt(0) - SLOT_BASE;
      return index >= 0 && index < slots.length ? slots[index] : char;
    });
  }

  function highlight(escapedCode) {
    var slots = [];

    function hold(html) {
      slots.push(html);
      return slotToken(slots.length - 1);
    }

    var out = escapedCode
      /* کامنت‌ها */
      .replace(/(^|\n)(\s*)(#[^\n]*)/g, function (all, br, pad, body) {
        return br + pad + hold('<span class="tok-comment">' + body + "</span>");
      })
      .replace(/\/\/[^\n]*/g, function (all) {
        return hold('<span class="tok-comment">' + all + "</span>");
      })
      .replace(/\/\*[\s\S]*?\*\//g, function (all) {
        return hold('<span class="tok-comment">' + all + "</span>");
      })
      /* رشته‌ها */
      .replace(/(&quot;|'|`)(?:\\.|(?!\1)[^\\\n])*\1/g, function (all) {
        return hold('<span class="tok-string">' + all + "</span>");
      })
      /* عدد */
      .replace(/\b\d+(?:\.\d+)?\b/g, function (all) {
        return hold('<span class="tok-number">' + all + "</span>");
      })
      /* کلمه‌های کلیدی */
      .replace(KEYWORD_RE, function (all, word) {
        return hold('<span class="tok-keyword">' + word + "</span>");
      })
      /* نام تابع پیش از پرانتز */
      .replace(/\b([A-Za-z_][\w$]*)(?=\()/g, function (all, name) {
        return hold('<span class="tok-func">' + name + "</span>");
      });

    /* بازگرداندن نگهدارنده‌ها (تودرتو هم پوشش داده می‌شود) */
    for (var pass = 0; pass < 3 && SLOT_RE.test(out); pass += 1) {
      SLOT_RE.lastIndex = 0;
      out = restoreSlots(out, slots);
    }
    SLOT_RE.lastIndex = 0;

    return out;
  }

  /* ---------- قالب‌بندی درون‌خطی ---------- */

  /** ورودی باید از قبل escape شده باشد */
  function inline(text) {
    var slots = [];

    function hold(html) {
      slots.push(html);
      return slotToken(slots.length - 1);
    }

    var out = String(text)
      /* کد درون‌خطی — زودتر از همه تا داخلش دست نخورد */
      .replace(/`([^`]+)`/g, function (all, code) {
        return hold('<code class="mono">' + code + "</code>");
      })
      /* تصویر */
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (all, alt, url) {
        return hold(
          '<img alt="' + alt + '" src="' + safeUrl(url) + '" loading="lazy" />'
        );
      })
      /* لینک */
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (all, label, url) {
        return hold(
          '<a href="' +
            safeUrl(url) +
            '" target="_blank" rel="noopener">' +
            label +
            "</a>"
        );
      })
      /* لینک خام */
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, function (all, pre, url) {
        return (
          pre +
          hold(
            '<a href="' +
              safeUrl(url) +
              '" target="_blank" rel="noopener">' +
              url +
              "</a>"
          )
        );
      })
      /* بولدِ ایتالیک */
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      /* بولد */
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      /* ایتالیک */
      .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>")
      /* خط‌خورده */
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      /* هایلایت */
      .replace(/==([^=]+)==/g, '<mark class="mark">$1</mark>');

    for (var pass = 0; pass < 3 && SLOT_RE.test(out); pass += 1) {
      SLOT_RE.lastIndex = 0;
      out = restoreSlots(out, slots);
    }
    SLOT_RE.lastIndex = 0;

    return out;
  }

  /* ---------- تشخیص جدول ---------- */

  function isTableSeparator(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
  }

  function isTableRow(line) {
    return line.indexOf("|") >= 0 && /\S/.test(line);
  }

  function splitRow(line) {
    return line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map(function (cell) {
        return cell.trim();
      });
  }

  function alignmentsFrom(line) {
    return splitRow(line).map(function (cell) {
      var startsWith = cell.charAt(0) === ":";
      var endsWith = cell.charAt(cell.length - 1) === ":";
      if (startsWith && endsWith) return "center";
      if (endsWith) return "left";
      if (startsWith) return "right";
      return "";
    });
  }

  function cellStyle(align) {
    return align ? ' style="text-align:' + align + '"' : "";
  }

  /* ---------- تبدیل اصلی ---------- */

  function render(source) {
    var lines = String(source || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");

    var html = [];
    var listStack = []; /* [{ type: "ul"|"ol", indent: number }] */
    var index = 0;

    function closeListsTo(indent) {
      while (
        listStack.length &&
        listStack[listStack.length - 1].indent >= indent
      ) {
        html.push("</" + listStack.pop().type + ">");
      }
    }

    function closeAllLists() {
      while (listStack.length) html.push("</" + listStack.pop().type + ">");
    }

    while (index < lines.length) {
      var rawLine = lines[index];
      var line = rawLine.replace(/\s+$/, "");
      var trimmed = line.trim();

      /* ---- کد بلاک ---- */
      var fence = trimmed.match(/^```+\s*([\w+#-]*)\s*$/);
      if (fence) {
        closeAllLists();

        var language = fence[1] || "";
        var buffer = [];
        index += 1;

        while (index < lines.length && !/^\s*```+\s*$/.test(lines[index])) {
          buffer.push(lines[index]);
          index += 1;
        }
        index += 1; /* رد شدن از فنس پایانی */

        html.push(
          '<div class="code-block">' +
            (language
              ? '<span class="code-block__lang">' +
                escapeHtml(language) +
                "</span>"
              : "") +
            '<pre class="code" dir="ltr"><code>' +
            highlight(escapeHtml(buffer.join("\n"))) +
            "</code></pre></div>"
        );
        continue;
      }

      /* ---- خط خالی ---- */
      if (!trimmed) {
        closeAllLists();
        index += 1;
        continue;
      }

      /* ---- خط جداکننده ---- */
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        closeAllLists();
        html.push("<hr />");
        index += 1;
        continue;
      }

      /* ---- جدول ---- */
      if (
        isTableRow(line) &&
        index + 1 < lines.length &&
        isTableSeparator(lines[index + 1])
      ) {
        closeAllLists();

        var aligns = alignmentsFrom(lines[index + 1]);
        var headCells = splitRow(line);
        var table = ['<div class="table-wrap"><table><thead><tr>'];

        headCells.forEach(function (cell, cellIndex) {
          table.push(
            "<th" +
              cellStyle(aligns[cellIndex]) +
              ">" +
              inline(escapeHtml(cell)) +
              "</th>"
          );
        });
        table.push("</tr></thead><tbody>");

        index += 2;
        while (
          index < lines.length &&
          isTableRow(lines[index]) &&
          lines[index].trim()
        ) {
          var bodyCells = splitRow(lines[index]);
          table.push("<tr>");
          for (var c = 0; c < headCells.length; c += 1) {
            table.push(
              "<td" +
                cellStyle(aligns[c]) +
                ">" +
                inline(escapeHtml(bodyCells[c] || "")) +
                "</td>"
            );
          }
          table.push("</tr>");
          index += 1;
        }

        table.push("</tbody></table></div>");
        html.push(table.join(""));
        continue;
      }

      /* ---- عنوان ---- */
      var heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        closeAllLists();
        var level = Math.min(6, heading[1].length + 1); /* # → h2 */
        html.push(
          "<h" +
            level +
            ">" +
            inline(escapeHtml(heading[2])) +
            "</h" +
            level +
            ">"
        );
        index += 1;
        continue;
      }

      /* ---- نقل‌قول (چندخطی) ---- */
      if (/^>\s?/.test(trimmed)) {
        closeAllLists();

        var quote = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          quote.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }
        html.push("<blockquote>" + render(quote.join("\n")) + "</blockquote>");
        continue;
      }

      /* ---- آیتم لیست (با تودرتویی) ---- */
      var listItem = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (listItem) {
        var indent = listItem[1].replace(/\t/g, "    ").length;
        var type = /^\d/.test(listItem[2]) ? "ol" : "ul";
        var content = listItem[3];

        /* بستن سطح‌های عمیق‌تر */
        while (
          listStack.length &&
          listStack[listStack.length - 1].indent > indent
        ) {
          html.push("</" + listStack.pop().type + ">");
        }

        var top = listStack[listStack.length - 1];
        if (!top || top.indent < indent) {
          html.push("<" + type + ">");
          listStack.push({ type: type, indent: indent });
        } else if (top.type !== type) {
          html.push("</" + listStack.pop().type + ">");
          html.push("<" + type + ">");
          listStack.push({ type: type, indent: indent });
        }

        /* چک‌لیست */
        var task = content.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          var checked = task[1].toLowerCase() === "x";
          html.push(
            '<li class="task' +
              (checked ? " task--done" : "") +
              '"><input type="checkbox" disabled' +
              (checked ? " checked" : "") +
              "/><span>" +
              inline(escapeHtml(task[2])) +
              "</span></li>"
          );
        } else {
          html.push("<li>" + inline(escapeHtml(content)) + "</li>");
        }

        index += 1;
        continue;
      }

      /* ---- پاراگراف (خطوط پیوسته با هم جمع می‌شوند) ---- */
      closeAllLists();

      var paragraph = [];
      while (index < lines.length) {
        var next = lines[index].replace(/\s+$/, "");
        if (
          !next.trim() ||
          /^```/.test(next.trim()) ||
          /^#{1,6}\s/.test(next.trim()) ||
          /^>\s?/.test(next.trim()) ||
          /^(-{3,}|\*{3,}|_{3,})$/.test(next.trim()) ||
          /^(\s*)([-*+]|\d+[.)])\s+/.test(next) ||
          (isTableRow(next) &&
            index + 1 < lines.length &&
            isTableSeparator(lines[index + 1]))
        ) {
          break;
        }
        paragraph.push(next.trim());
        index += 1;
      }

      if (paragraph.length) {
        html.push("<p>" + inline(escapeHtml(paragraph.join(" "))) + "</p>");
      } else {
        index += 1;
      }
    }

    closeAllLists();
    return html.join("\n");
  }

  /** متن ساده بدون نشانه‌های مارک‌داون — برای خلاصه و شمارش */
  function plainText(source) {
    return String(source || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^\s*\|.*\|\s*$/gm, " ")
      .replace(/[#>*_~`=|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return { render: render, escapeHtml: escapeHtml, plainText: plainText };
})();
