/* ============================================================
   AI 术语手册 — 应用逻辑
   - 纯静态、无依赖，file:// 直接打开可用
   - hash 路由：#home / #cat=<id> / #term=<id> / #guide
   ============================================================ */
(function () {
  'use strict';

  var TERMS = window.AI_TERMS || [];
  var CATS = window.AI_CATEGORIES || [];
  var CATMAP = {};
  CATS.forEach(function (c) { CATMAP[c.id] = c; });

  var BYID = {};
  TERMS.forEach(function (t, i) { t._idx = i; BYID[t.id] = t; });

  // 概念别名重定向：未单独建页的概念指向最贴近的词条
  var ALIAS = window.AI_ALIAS || {};
  function resolveId(raw) {
    if (BYID[raw]) return raw;
    var target = ALIAS[raw];
    return (target && BYID[target]) ? target : null;
  }

  // 解析关联：解析别名、去重，不足 6 个时用同分类词条补足
  TERMS.forEach(function (t) {
    var seen = {};
    var list = [];
    (t.related || []).forEach(function (raw) {
      var id = resolveId(raw);
      if (id && id !== t.id && !seen[id]) { seen[id] = 1; list.push(id); }
    });
    if (list.length < 6) {
      for (var i = 0; i < TERMS.length && list.length < 6; i++) {
        var o = TERMS[i];
        if (o.cat === t.cat && o.id !== t.id && !seen[o.id]) { seen[o.id] = 1; list.push(o.id); }
      }
    }
    t._related = list.slice(0, 8);
  });

  var LINK_COUNT = TERMS.reduce(function (s, t) { return s + t._related.length; }, 0);
  var CAT_COUNT = {};
  TERMS.forEach(function (t) { CAT_COUNT[t.cat] = (CAT_COUNT[t.cat] || 0) + 1; });

  var state = { query: '', cat: 'all', view: 'home', current: null };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    viewHome: $('view-home'), viewTerm: $('view-term'),
    grid: $('termGrid'), catCards: $('catCards'), empty: $('emptyState'),
    search: $('searchInput'), searchClear: $('searchClear'),
    resultHint: $('resultHint'), listSub: $('listSub'),
    article: $('termArticle'), breadcrumb: $('breadcrumb'), pager: $('termPager'),
    toast: $('toast')
  };

  /* ---------- 工具函数 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 轻量标记：**加粗** 与 `代码`
  function fmt(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function highlight(text, query) {
    var out = esc(text);
    var words = query.trim().split(/\s+/).filter(Boolean);
    words.forEach(function (w) {
      try {
        out = out.replace(new RegExp('(' + escapeRe(esc(w)) + ')', 'gi'), '<mark>$1</mark>');
      } catch (e) { /* 忽略非法正则 */ }
    });
    return out;
  }

  function catOf(t) { return CATMAP[t.cat] || CATS[0] || { zh: '其他', en: '', color: '#4f6bed', no: '00' }; }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.toast.classList.remove('show'); }, 2000);
  }

  function searchBlob(t) {
    if (t._blob) return t._blob;
    var c = catOf(t);
    var parts = [t.id, t.zh, t.en, t.alias, t.brief, c.zh, c.en, t.year];
    (t.body || []).forEach(function (s) { parts.push(s.h, s.p); });
    (t.points || []).forEach(function (p) { parts.push(p); });
    if (t.note) parts.push(t.note.t, t.note.p);
    t._blob = parts.join(' ').toLowerCase();
    return t._blob;
  }

  function matches(t, q) {
    if (!q.trim()) return true;
    var words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var blob = searchBlob(t);
    return words.every(function (w) { return blob.indexOf(w) >= 0; });
  }

  // 相关度打分：标题 > 英文名/别名 > 简介 > 要点 > 正文
  function score(t, q) {
    if (!q.trim()) return 0;
    var s = 0;
    var zh = t.zh.toLowerCase();
    var en = (t.en || '').toLowerCase();
    var al = (t.alias || '').toLowerCase();
    var br = (t.brief || '').toLowerCase();
    var pts = (t.points || []).join(' ').toLowerCase();
    q.trim().toLowerCase().split(/\s+/).filter(Boolean).forEach(function (w) {
      if (zh === w) s += 100;
      else if (zh.indexOf(w) === 0) s += 60;
      else if (zh.indexOf(w) >= 0) s += 40;
      if (en === w || al === w) s += 50;
      else if (en.indexOf(w) === 0 || al.indexOf(w) === 0) s += 45;
      else if (en.indexOf(w) >= 0 || al.indexOf(w) >= 0) s += 30;
      if (br.indexOf(w) >= 0) s += 12;
      if (pts.indexOf(w) >= 0) s += 4;
    });
    return s;
  }

  function filtered() {
    var q = state.query;
    var list = TERMS.filter(function (t) {
      if (state.cat !== 'all' && t.cat !== state.cat) return false;
      return matches(t, q);
    });
    if (q.trim()) {
      list.sort(function (a, b) {
        return (score(b, q) - score(a, q)) || (a._idx - b._idx);
      });
    }
    return list;
  }

  /* ---------- 首页渲染 ---------- */
  function renderCatCards() {
    el.catCards.innerHTML = CATS.map(function (c) {
      var active = state.cat === c.id ? ' active' : '';
      return '<button type="button" class="cat-card' + active + '" data-cat="' + c.id + '" style="--cat:' + c.color + '">' +
        '<div class="cat-card-top"><span class="cat-no">' + c.no + '</span><span class="cat-num">' + (CAT_COUNT[c.id] || 0) + ' 条</span></div>' +
        '<h3>' + esc(c.zh) + '</h3><div class="cat-en">' + esc(c.en) + '</div>' +
        '<p>' + esc(c.desc) + '</p></button>';
    }).join('');
  }

  function renderGrid() {
    var list = filtered();
    var q = state.query;

    el.grid.innerHTML = list.map(function (t) {
      var c = catOf(t);
      return '<a class="term-card" href="#term=' + encodeURIComponent(t.id) + '" data-term="' + esc(t.id) + '" style="--cat:' + c.color + '">' +
        '<span class="tc-cat"><span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block"></span>' + esc(c.zh) + '</span>' +
        '<h3>' + highlight(t.zh, q) + '</h3>' +
        '<div class="tc-en">' + highlight(t.en, q) + '</div>' +
        '<p class="tc-brief">' + esc(t.brief) + '</p></a>';
    }).join('');

    el.empty.hidden = list.length > 0;
    el.grid.hidden = list.length === 0;

    var cname = state.cat === 'all' ? '' : catOf({ cat: state.cat }).zh + ' · ';
    if (q.trim()) {
      el.resultHint.innerHTML = '找到 <b>' + list.length + '</b> 个匹配词条';
      el.listSub.textContent = cname + '「' + q.trim() + '」的搜索结果';
    } else if (state.cat !== 'all') {
      el.resultHint.innerHTML = '<b>' + list.length + '</b> 个词条';
      el.listSub.textContent = cname + '共 ' + list.length + ' 个词条，点分类标签可切换';
    } else {
      el.resultHint.innerHTML = '共 <b>' + TERMS.length + '</b> 个词条';
      el.listSub.textContent = '按分类顺序排列，点击任意卡片查看详解';
    }
    el.searchClear.hidden = !q;
  }

  function showHome() {
    state.view = 'home';
    el.viewTerm.hidden = true;
    el.viewHome.hidden = false;
    document.title = 'AI 术语手册 · 人工智能常用关键词详解';
    renderCatCards();
    renderGrid();
  }

  /* ---------- 详情页渲染 ---------- */
  function showTerm(t) {
    state.view = 'term';
    state.current = t;
    var c = catOf(t);
    var color = c.color;

    el.viewHome.hidden = true;
    el.viewTerm.hidden = false;
    document.querySelector('.detail-container').style.setProperty('--cat', color);
    document.title = t.zh + ' · ' + t.en + ' | AI 术语手册';

    el.breadcrumb.innerHTML =
      '<a href="#home">全部词条</a><span class="sep">/</span>' +
      '<a href="#cat=' + c.id + '" class="crumb-cat" style="--cat:' + color + '">' + esc(c.zh) + '</a>' +
      '<span class="sep">/</span><span>' + esc(t.zh) + '</span>';

    var html = '';
    html += '<div class="term-header">';
    html += '<div class="th-kicker">' +
      '<span class="th-cat">' + esc(c.zh) + '</span>' +
      '<span class="th-idx">NO. ' + String(t._idx + 1).padStart(3, '0') + ' / ' + TERMS.length + '</span>' +
      (t.year ? '<span class="th-year">' + esc(t.year) + '</span>' : '') +
      '</div>';
    html += '<h1>' + esc(t.zh) + '</h1>';
    html += '<div class="th-en">' + esc(t.en) + '</div>';
    if (t.alias) html += '<div class="th-alias"><b>又称／别名：</b>' + esc(t.alias) + '</div>';
    html += '<div class="th-brief">' + fmt(t.brief) + '</div>';
    html += '</div>';

    html += '<div class="term-body">';
    (t.body || []).forEach(function (s) {
      html += '<section class="body-section"><h2>' + esc(s.h) + '</h2>';
      String(s.p).split(/\n\n+/).forEach(function (p) { html += '<p>' + fmt(p) + '</p>'; });
      html += '</section>';
    });

    if (t.points && t.points.length) {
      html += '<div class="points-box"><h3><span class="pb-icon">✦</span>核心要点</h3><ul>' +
        t.points.map(function (p) { return '<li>' + fmt(p) + '</li>'; }).join('') + '</ul></div>';
    }

    if (t.note) {
      html += '<div class="note-box"><div class="nb-icon">ⓘ</div><div>' +
        '<h3>' + esc(t.note.t || '补充说明') + '</h3><p>' + fmt(t.note.p) + '</p></div></div>';
    }

    if (t._related && t._related.length) {
      html += '<div class="related-box"><h3>相关词条</h3><p class="rb-sub">顺着这些概念继续往下读</p><div class="related-list">' +
        t._related.map(function (id) {
          var r = BYID[id], rc = catOf(r);
          return '<a class="related-chip" href="#term=' + encodeURIComponent(id) + '" style="--rc:' + rc.color + '">' +
            '<span class="rc-dot"></span>' + esc(r.zh) + '<span class="rc-arrow">→</span></a>';
        }).join('') + '</div></div>';
    }
    html += '</div>';

    el.article.innerHTML = html;

    // 上一篇 / 下一篇
    var prev = TERMS[t._idx - 1], next = TERMS[t._idx + 1];
    el.pager.innerHTML =
      (prev ? '<a class="pager-card prev" href="#term=' + encodeURIComponent(prev.id) + '"><span class="pg-label">← 上一个词条</span><span class="pg-title">' + esc(prev.zh) + '</span></a>' : '<span class="pager-empty"></span>') +
      (next ? '<a class="pager-card next" href="#term=' + encodeURIComponent(next.id) + '"><span class="pg-label">下一个词条 →</span><span class="pg-title">' + esc(next.zh) + '</span></a>' : '<span class="pager-empty"></span>');

    window.scrollTo(0, 0);
  }

  /* ---------- 路由 ---------- */
  function parseHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (e) { h = location.hash.replace(/^#/, ''); }
    if (h.indexOf('term=') === 0) return { type: 'term', id: h.slice(5) };
    if (h.indexOf('cat=') === 0) return { type: 'cat', id: h.slice(4) };
    if (h === 'guide') return { type: 'guide' };
    return { type: 'home' };
  }

  function render() {
    var r = parseHash();
    if (r.type === 'term' && BYID[r.id]) { showTerm(BYID[r.id]); return; }
    if (r.type === 'cat' && CATMAP[r.id]) state.cat = r.id;
    else if (r.type === 'home') state.cat = 'all';
    showHome();
    if (r.type === 'guide') {
      setTimeout(function () {
        var g = $('guide');
        if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }

  function goHome() {
    location.hash = (state.cat && state.cat !== 'all') ? '#cat=' + state.cat : '#home';
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    // 词条卡片 / 分类卡 / 相关词条：全部走原生 hash 链接，这里只拦截分类卡
    el.catCards.addEventListener('click', function (e) {
      var btn = e.target.closest('.cat-card');
      if (!btn) return;
      var id = btn.getAttribute('data-cat');
      location.hash = (state.cat === id) ? '#home' : '#cat=' + id;
    });

    el.search.addEventListener('input', function () {
      state.query = el.search.value;
      if (state.view === 'term') {
        // 详情页搜索时回到列表
        location.hash = (state.cat && state.cat !== 'all') ? '#cat=' + state.cat : '#home';
      } else {
        renderGrid();
      }
    });

    el.search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        el.search.value = ''; state.query = '';
        renderGrid(); el.search.blur();
      }
      if (e.key === 'Enter') {
        var first = el.grid.querySelector('.term-card');
        if (first) first.click();
      }
    });

    el.searchClear.addEventListener('click', function () {
      el.search.value = ''; state.query = ''; renderGrid(); el.search.focus();
    });

    $('resetBtn').addEventListener('click', function () {
      state.query = ''; state.cat = 'all'; el.search.value = '';
      location.hash = '#home'; renderGrid();
    });

    $('backBtn').addEventListener('click', goHome);
    $('backBtn2').addEventListener('click', goHome);
    $('brandLink').addEventListener('click', function () { state.cat = 'all'; });
    $('navHome').addEventListener('click', function () { state.cat = 'all'; });

    $('copyBtn').addEventListener('click', function () {
      if (!state.current) return;
      var url = location.href.split('#')[0] + '#term=' + encodeURIComponent(state.current.id);
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('链接已复制'); }
        catch (err) { toast('请复制地址栏链接'); }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('词条链接已复制'); }, fallback);
      } else fallback();
    });

    // 主题
    var themeBtn = $('themeToggle');
    try {
      var saved = localStorage.getItem('ai-glossary-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch (e) { /* file:// 下可能禁用 */ }
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ai-glossary-theme', next); } catch (e) {}
      toast(next === 'dark' ? '已切换到深色主题' : '已切换到浅色主题');
    });

    // 快捷键
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable;
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (state.view === 'term') goHome();
        setTimeout(function () { el.search.focus(); el.search.select(); }, 30);
      } else if (e.key === 'Escape' && !typing) {
        if (state.query) { el.search.value = ''; state.query = ''; renderGrid(); }
        else if (state.view === 'term') goHome();
      }
    });

    window.addEventListener('hashchange', function () {
      render();
      // 从详情页回到列表时保持在顶部
      if (state.view === 'home') window.scrollTo(0, 0);
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (!TERMS.length) {
      el.grid.innerHTML = '<p style="color:var(--text-3);padding:40px 0">词条数据未能加载，请确认 data/ 目录下的 js 文件与 index.html 在同一文件夹。</p>';
      return;
    }
    // 统计数字
    $('topCount').textContent = TERMS.length + ' 个词条';
    $('statTerms').textContent = TERMS.length;
    $('statLinks').textContent = LINK_COUNT;
    $('heroCount').textContent = TERMS.length;
    $('footerCount').textContent = '共 ' + TERMS.length + ' 个词条';
    $('footerCount2').textContent = '共 ' + TERMS.length + ' 个词条';
    bind();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
