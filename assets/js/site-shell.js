(function () {
  const shell = document.getElementById('siteShell');
  if (!shell) return;

  const current = location.pathname.split('/').pop() || 'index.html';
  const items = [
    ['/', '首页', current === '' || current === 'index.html'],
    ['/tools.html', '在线工具', current === 'tools.html'],
    ['/travel-china/index.html', '中国著名景点', false, true],
    ['/travel-map/index.html', '中国旅行地图', false, true],
    ['/5a.html', '5A景区', false, true],
    ['/game.html', '小游戏大合集', current === 'game.html', true]
  ];

  const engines = [
    ['yandex', '🔍 Yandex'], ['bing', '🔍 必应'], ['google', '🔍 谷歌'],
    ['baidu', '🔍 百度'], ['sogou', '🔍 搜狗'], ['baiduai', '🤖 百度 AI 搜索'],
    ['nami', '🤖 纳米 AI 搜索'], ['tiangong', '🤖 天工 AI 搜索'],
    ['metaso', '🤖 秘塔 AI 搜索'], ['wiki', '📖 维基百科'], ['github', '📖 GitHub']
  ];

  const now = new Date();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  shell.className = 'site-shell';
  shell.innerHTML = `
    <div class="site-shell-date">
      <a href="/">${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}</a>
      <span id="shellTime" class="site-shell-time"></span>
    </div>
    <nav class="site-shell-nav" aria-label="站点导航">
      ${items.map(([href, label, active, external]) => `
        <a href="${href}"${active ? ' aria-current="page"' : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>
      `).join('')}
    </nav>
    <div class="site-shell-search" role="search">
      <input id="shellSearch" type="search" placeholder="请输入内容" autocomplete="off" aria-label="站内搜索" />
      <div class="site-shell-engine">
        <button id="shellEngine" type="button" aria-label="搜索引擎">🔍 百度⌄</button>
        <div id="shellMenu" class="site-shell-menu" aria-label="搜索引擎菜单">
          ${engines.map(([key, label]) => `<button type="button" data-engine="${key}">${label}</button>`).join('')}
        </div>
      </div>
      <button id="shellSearchButton" type="button">搜索</button>
    </div>
    <div class="site-shell-poem">
      <div id="shellPoem"></div>
      <div id="shellPoemInfo"></div>
    </div>
  `;

  const timeEl = document.getElementById('shellTime');
  const updateTime = () => {
    if (!timeEl) return;
    timeEl.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  };

  updateTime();
  window.setInterval(updateTime, 1000);

  let engine = 'baidu';
  const menu = document.getElementById('shellMenu');
  const shellEngine = document.getElementById('shellEngine');
  const searchInput = document.getElementById('shellSearch');
  const searchButton = document.getElementById('shellSearchButton');

  const search = () => {
    const query = (searchInput && searchInput.value || '').trim();
    if (!query) {
      searchInput && searchInput.focus();
      return;
    }

    const encoded = encodeURIComponent(query);
    const urls = {
      baidu: `https://www.baidu.com/s?wd=${encoded}`,
      bing: `https://www.bing.com/search?q=${encoded}`,
      google: `https://www.google.com/search?q=${encoded}`,
      yandex: `https://yandex.com/search/?text=${encoded}`,
      sogou: `https://www.sogou.com/web?query=${encoded}`,
      github: `https://github.com/search?type=repositories&q=${encoded}`,
      baiduai: `https://chat.baidu.com/search?word=${encoded}`,
      nami: `https://n.cn/?q=${encoded}`,
      tiangong: `https://tiangong.cn/result/?q=${encoded}`,
      metaso: `https://metaso.cn/?q=${encoded}`,
      wiki: `https://zh.wikipedia.org/wiki/${encoded}`
    };

    window.open(urls[engine] || urls.baidu, '_blank', 'noopener,noreferrer');
  };

  if (shellEngine && menu) {
    shellEngine.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.classList.toggle('is-open');
    });

    menu.querySelectorAll('[data-engine]').forEach((button) => {
      button.addEventListener('click', () => {
        engine = button.dataset.engine || engine;
        shellEngine.textContent = button.textContent + '⌄';
        menu.classList.remove('is-open');
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && event.target !== shellEngine) {
        menu.classList.remove('is-open');
      }
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', search);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        search();
      }
    });
  }

  const loadPoem = () => {
    const poemScript = document.createElement('script');
    poemScript.src = 'https://sdk.jinrishici.com/v2/browser/jinrishici.js';
    poemScript.async = true;
    poemScript.onload = () => {
      const poemEl = document.getElementById('shellPoem');
      const infoEl = document.getElementById('shellPoemInfo');
      if (!poemEl || !infoEl || !window.jinrishici || typeof window.jinrishici.load !== 'function') return;

      window.jinrishici.load((result) => {
        if (!result || !result.data) return;
        poemEl.textContent = result.data.content || '';
        const origin = result.data.origin || {};
        infoEl.textContent = `【${origin.dynasty || ''}】${origin.author || ''}《${origin.title || ''}》`;
      });
    };
    poemScript.onerror = () => {
      const poemEl = document.getElementById('shellPoem');
      if (poemEl) poemEl.textContent = '静心阅读，万事自顺';
    };
    document.head.appendChild(poemScript);
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadPoem);
  } else {
    window.setTimeout(loadPoem, 800);
  }
})();
