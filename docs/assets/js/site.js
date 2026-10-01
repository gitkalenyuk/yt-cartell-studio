/* YT Cartell Studio — site behaviour. Vanilla, no trackers. */
(function () {
  "use strict";

  var REPO = "gitkalenyuk/yt-cartell-studio";
  var RELEASES_URL = "https://github.com/" + REPO + "/releases";
  var API = "https://api.github.com/repos/" + REPO;
  var CACHE_KEY = "ytcs-releases-v1";
  var CACHE_TTL = 10 * 60 * 1000;
  var THEME_KEY = "ytcs-theme";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------------- theme ---------------- */
  function syncPictures() {
    var saved = store(THEME_KEY);
    var media = saved === "dark" ? "all" : saved === "light" ? "not all" : "(prefers-color-scheme: dark)";
    $$("source[data-dark]").forEach(function (s) { if (s.media !== media) s.media = media; });
  }
  function applyTheme(t, animate) {
    if (animate && !reduceMotion.matches) {
      root.classList.add("theme-anim");
      clearTimeout(applyTheme.t);
      applyTheme.t = setTimeout(function () { root.classList.remove("theme-anim"); }, 320);
    }
    root.setAttribute("data-theme", t);
    var btn = $(".theme-toggle");
    if (btn) btn.setAttribute("aria-label", t === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему");
    syncPictures();
  }
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
  var toggle = $(".theme-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    store(THEME_KEY, next);
    applyTheme(next, true);
  });
  var onSystem = function () { if (!store(THEME_KEY)) applyTheme(systemDark.matches ? "dark" : "light", true); };
  if (systemDark.addEventListener) systemDark.addEventListener("change", onSystem); else if (systemDark.addListener) systemDark.addListener(onSystem);

  /* ---------------- header ---------------- */
  var header = $(".site-header");
  var onScroll = function () { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // One orange button per view: the header button turns orange only while no other orange button is on screen.
  var headerCta = $(".header-cta");
  if ("IntersectionObserver" in window && headerCta) {
    var visible = new Set();
    var started = false;
    var syncCta = function () {
      var other = false;
      visible.forEach(function (el) { if (el.classList.contains("btn-primary")) other = true; });
      var on = started && !other;
      headerCta.classList.toggle("btn-primary", on);
      headerCta.classList.toggle("btn-secondary", !on);
    };
    var ctaIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      started = window.scrollY > 200;
      syncCta();
    });
    $$("main .btn").forEach(function (b) { ctaIO.observe(b); });
    window.addEventListener("scroll", function () { var s = window.scrollY > 200; if (s !== started) { started = s; syncCta(); } }, { passive: true });
    window.__ytcsSyncCta = syncCta;
  }

  /* ---------------- motion ---------------- */
  var hero = $(".hero");
  var ready = function () { if (hero) hero.classList.add("is-ready"); };
  if (reduceMotion.matches) ready();
  else {
    var fired = false;
    var go = function () { if (!fired) { fired = true; requestAnimationFrame(function () { requestAnimationFrame(ready); }); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 450);
  }

  var revealEls = $$("[data-reveal]");
  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- steps tabs ---------------- */
  var tabs = $$('.tabs-track [role="tab"]');
  var ind = $(".tabs-ind");
  var track = $(".tabs-track");
  function placeIndicator() {
    var cur = $('.tabs-track [aria-selected="true"]');
    if (!cur || !ind) return;
    ind.style.width = cur.offsetWidth + "px";
    ind.style.transform = "translateX(" + cur.offsetLeft + "px)";
  }
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute("aria-controls"));
      if (!p) return;
      if (on) {
        var was = p.hidden;
        p.hidden = false;
        if (was && !reduceMotion.matches) {
          p.classList.remove("is-entering"); void p.offsetWidth; p.classList.add("is-entering");
        }
        // panel content was hidden when the page loaded: reveal it now
        $$("[data-reveal]", p).forEach(function (el) { el.classList.add("is-in"); });
      } else p.hidden = true;
    });
    if (focus) tab.focus();
    placeIndicator();
    if (track && tab.scrollIntoView && track.scrollWidth > track.clientWidth) {
      track.scrollTo({ left: tab.offsetLeft - 24, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
  }
  if (tabs.length) {
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { selectTab(t, false); });
      t.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
      });
    });
    tabs.forEach(function (t, i) { if (i > 0) { var p = document.getElementById(t.getAttribute("aria-controls")); if (p) p.hidden = true; } });
    placeIndicator();
    window.addEventListener("resize", placeIndicator);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeIndicator);
    // warm the other steps' screenshots once the section is near
    var how = $("#how");
    if (how && "IntersectionObserver" in window) {
      var warm = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        warm.disconnect();
        $$(".step-panel img", how).forEach(function (img) { img.loading = "eager"; });
      }, { rootMargin: "400px 0px" });
      warm.observe(how);
    }
  }

  /* ---------------- style wall ---------------- */
  var grid = $("#style-grid");
  var chips = $$(".chips .chip");
  var moreBtn = $("#styles-all");
  var expanded = false;
  var filter = "all";
  function collapsedCount() {
    var cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length || 2;
    return cols * (cols <= 2 ? 5 : 3);
  }
  function renderStyles(animate) {
    var tiles = $$(".style", grid);
    var limit = filter === "all" && !expanded ? collapsedCount() : Infinity;
    var shown = 0, d = 0;
    tiles.forEach(function (li) {
      var match = filter === "all" || li.getAttribute("data-cat") === filter;
      var show = match && shown < limit;
      if (match) shown++;
      var wasHidden = li.hidden;
      li.hidden = !show;
      li.classList.remove("is-new");
      if (show && animate && (wasHidden || filter !== "all") && !reduceMotion.matches) {
        li.style.setProperty("--d", d++);
        void li.offsetWidth;
        li.classList.add("is-new");
      }
    });
    if (moreBtn) {
      var total = filter === "all" ? tiles.length : 0;
      moreBtn.hidden = !(filter === "all" && (expanded || shown > limit));
      moreBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
      var label = moreBtn.firstChild;
      if (label && label.nodeType === 3) label.nodeValue = expanded ? "Згорнути" : "Показати всі " + total + " стилів";
      moreBtn.classList.toggle("is-open", expanded);
    }
  }
  if (grid) {
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        filter = c.getAttribute("data-filter");
        chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        renderStyles(true);
      });
    });
    if (moreBtn) moreBtn.addEventListener("click", function () {
      expanded = !expanded;
      renderStyles(expanded);
      if (!expanded) grid.scrollIntoView({ block: "start", behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
    renderStyles(false);
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (!expanded) renderStyles(false); }, 150); });
  }

  /* ---------------- tutorial video ---------------- */
  (function () {
    var card = $("#video-card");
    if (!card) return;
    var v = document.createElement("video");
    v.controls = true;
    v.preload = "metadata";
    v.playsInline = true;
    v.setAttribute("aria-label", "Відеоурок YT Cartell Studio");
    v.addEventListener("loadedmetadata", function () {
      // the poster is optional: without it the first screenshot of the app stands in
      var probe = new Image();
      probe.onload = function () { v.poster = probe.src; };
      probe.onerror = function () { v.poster = "assets/img/shots/hero-light-1080.webp"; };
      probe.src = "media/tutorial-poster.jpg";
      var empty = $("#video-empty");
      if (empty) empty.remove();
      card.classList.add("has-video");
      card.appendChild(v);
    }, { once: true });
    v.src = "media/tutorial.mp4";
    v.load();
  })();

  /* ---------------- OS detection ---------------- */
  var ua = navigator.userAgent || "";
  var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  var os = "other";
  if (/Android|iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(plat) && navigator.maxTouchPoints > 1)) os = "mobile";
  else if (/Win/i.test(plat) || /Windows/i.test(ua)) os = "win";
  else if (/Mac/i.test(plat) || /Mac OS X/i.test(ua)) os = "mac-arm";
  else if (/Linux|X11|CrOS/i.test(plat + ua)) os = "linux";

  // Chromium on a Mac can tell Apple Silicon from Intel; Safari and Firefox cannot, so Apple Silicon is the default.
  if (os === "mac-arm" && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(["architecture"]).then(function (v) {
      if (v && v.architecture === "x86") { os = "mac-x64"; if (last) render(last[0], last[1], last[2]); }
    }).catch(function () {});
  }

  /* ---------------- releases ---------------- */
  var nf = new Intl.NumberFormat("uk-UA");
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function mb(bytes) {
    var v = bytes / 1048576;
    return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: v >= 10 ? 0 : 1 }).format(v) + " МБ";
  }
  function dateUk(iso) {
    try { return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)); } catch (e) { return ""; }
  }
  var PATTERNS = { "win": /windows-x64\.exe$/i, "mac-arm": /macos-arm64\.zip$/i, "mac-x64": /macos-x64\.zip$/i };
  var LABELS = { "win": "Завантажити для Windows", "mac-arm": "Завантажити для macOS", "mac-x64": "Завантажити для macOS" };
  var SYS = { "win": "Windows 10/11, 64-біт", "mac-arm": "macOS · Apple Silicon", "mac-x64": "macOS · Intel" };
  var EXT = { "win": ".exe", "mac-arm": ".zip", "mac-x64": ".zip" };

  function highlight(key) {
    $$(".dl-row").forEach(function (row) {
      var on = row.getAttribute("data-os") === key;
      row.classList.toggle("is-you", on);
      var you = $(".dl-you", row); if (you) you.hidden = !on;
      var b = $(".btn", row);
      if (b) { b.classList.toggle("btn-primary", on); b.classList.toggle("btn-secondary", !on); }
    });
    if (window.__ytcsSyncCta) window.__ytcsSyncCta();
  }

  var heroDl = $("#hero-dl"), heroLabel = $("#hero-dl-label"), heroMeta = $("#hero-meta-text"), heroCount = $("#hero-count");

  function setupHero(rel) {
    if (!heroDl) return;
    if (os === "mobile") {
      heroLabel.textContent = "Завантажити студію";
      heroDl.href = "#download";
      heroMeta.textContent = "Програма для комп'ютера: Windows 10/11 і macOS";
      return;
    }
    if (os === "linux" || os === "other") {
      heroLabel.textContent = "Завантажити студію";
      heroDl.href = "#download";
      heroMeta.textContent = "Є збірки для Windows і macOS";
      return;
    }
    heroLabel.textContent = LABELS[os];
    var a = rel && rel.assets && rel.assets[os];
    if (a) {
      heroDl.href = a.url;
      heroMeta.textContent = "Версія " + rel.version + " · " + mb(a.size) + " · " + SYS[os];
    } else {
      heroDl.href = rel && rel.url ? rel.url : RELEASES_URL;
      heroMeta.textContent = SYS[os] + (rel ? " · версія " + rel.version : "");
    }
  }

  var last = null;
  function render(rel, total, state) {
    last = [rel, total, state];
    setupHero(rel);
    highlight(os === "win" || os === "mac-arm" || os === "mac-x64" ? os : "");
    var status = $("#dl-status"), ver = $("#dl-version");
    Object.keys(PATTERNS).forEach(function (key) {
      var row = $('.dl-row[data-os="' + key + '"]');
      if (!row) return;
      var a = rel && rel.assets[key], btn = $(".btn", row), meta = $(".meta", row);
      if (a) {
        btn.href = a.url;
        btn.setAttribute("download", "");
        btn.setAttribute("aria-label", "Завантажити " + a.name + ", " + mb(a.size));
        meta.textContent = a.name + " · " + mb(a.size);
      } else if (rel) {
        btn.href = rel.url;
        btn.removeAttribute("download");
        meta.textContent = "У версії " + rel.version + " цього файлу ще немає — дивись усі версії";
      }
    });
    if (rel) {
      ver.textContent = "Версія " + rel.version + (rel.date ? " · " + dateUk(rel.date) : "");
    } else if (state === "none") {
      ver.textContent = "Перша версія от-от з'явиться";
    } else {
      ver.textContent = "Свіжа версія — на сторінці релізів GitHub";
    }
    var countText = "";
    if (typeof total === "number" && total > 0) countText = "Завантажено " + nf.format(total) + " " + plural(total, "раз", "рази", "разів");
    if (status) {
      if (countText) status.textContent = countText;
      else if (state === "none") status.textContent = "Файли будуть на сторінці релізів.";
      else if (state === "error") status.textContent = "Не вдалося отримати дані — файли є на сторінці релізів.";
      else status.textContent = "";
    }
    if (heroCount) {
      heroCount.hidden = !countText;
      if (countText) heroCount.innerHTML = "Завантажено <strong>" + nf.format(total) + "</strong> " + plural(total, "раз", "рази", "разів");
    }
  }

  function parseLatest(j) {
    var assets = {};
    (j.assets || []).forEach(function (a) {
      Object.keys(PATTERNS).forEach(function (k) {
        if (PATTERNS[k].test(a.name) && !assets[k]) assets[k] = { name: a.name, size: a.size, url: a.browser_download_url };
      });
    });
    return { version: String(j.tag_name || j.name || "").replace(/^v/i, ""), date: j.published_at, url: j.html_url || RELEASES_URL, assets: assets };
  }
  function sumDownloads(list) {
    var n = 0;
    (list || []).forEach(function (r) { (r.assets || []).forEach(function (a) { n += a.download_count || 0; }); });
    return n;
  }
  function getJSON(url) {
    return fetch(url, { headers: { "Accept": "application/vnd.github+json" } }).then(function (r) {
      if (!r.ok) { var e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
      return r.json();
    });
  }

  render(null, null, "loading");
  var cached = null;
  try { cached = JSON.parse(store(CACHE_KEY) || "null"); } catch (e) { cached = null; }
  if (cached && cached.rel) render(cached.rel, cached.total, "ok");
  if (cached && Date.now() - cached.t < CACHE_TTL) return;

  if (!window.fetch) { if (!cached) render(null, null, "error"); return; }
  Promise.all([
    getJSON(API + "/releases/latest").then(parseLatest).catch(function (e) { if (e.status === 404) return "none"; throw e; }),
    getJSON(API + "/releases?per_page=100").then(sumDownloads).catch(function () { return null; })
  ]).then(function (res) {
    var rel = res[0] === "none" ? null : res[0];
    var total = res[1];
    if (rel) {
      store(CACHE_KEY, JSON.stringify({ t: Date.now(), rel: rel, total: total }));
      render(rel, total, "ok");
    } else if (!cached) {
      render(null, total, "none");
    }
  }).catch(function () {
    if (!cached) render(null, null, "error");
  });
})();
