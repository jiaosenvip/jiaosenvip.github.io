(function () {
  // 去掉尾部斜杠后取最后一段，子目录页面（如 /ai-glossary/）也能正确高亮
  const current = location.pathname.replace(/\/+$/, '').split('/').pop() || 'index.html';
  const items = [
    ['/', '首页', current === 'index.html'],
    ['/tools.html', '在线工具', current === 'tools.html'],
    ['/ai-glossary/', 'AI术语', current === 'ai-glossary', true],
    ['/travel-map.html', '行迹', current === 'travel-map.html', true],
    ['/5a.html', '5A景区', false, true],
    ['/game.html', '小游戏', current === 'game.html', true]
  ];
  const engines = [
    ['yandex', '🔍 Yandex'], ['bing', '🔍 必应'], ['google', '🔍 谷歌'],
    ['baidu', '🔍 百度'], ['sogou', '🔍 搜狗'], ['baiduai', '🤖 百度 AI 搜索'],
    ['nami', '🤖 纳米 AI 搜索'], ['tiangong', '🤖 天工 AI 搜索'],
    ['metaso', '🤖 秘塔 AI 搜索'], ['wiki', '📖 维基百科'], ['github', '📖 GitHub']
  ];
  // 各引擎的搜索地址，提前建好，避免每次搜索重复构造
  const urls = {
    baidu:'https://www.baidu.com/s?wd=', bing:'https://www.bing.com/search?q=',
    google:'https://www.google.com/search?q=', yandex:'https://yandex.com/search/?text=',
    sogou:'https://www.sogou.com/web?query=', github:'https://github.com/search?type=repositories&q=',
    baiduai:'https://chat.baidu.com/search?word=', nami:'https://n.cn/?q=',
    tiangong:'https://tiangong.cn/result/?q=', metaso:'https://metaso.cn/?q=',
    wiki:'https://zh.wikipedia.org/wiki/'
  };
  const shell = document.getElementById('siteShell');
  if (!shell) return;
  const now = new Date();
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  shell.className = 'site-shell';
  shell.innerHTML = `
    <div class="site-shell-date"><a href="/">${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${weekdays[now.getDay()]}</a><span id="shellTime" class="site-shell-time"></span></div>
    <nav class="site-shell-nav" aria-label="站点导航">${items.map(item => `<a href="${item[0]}"${item[2] ? ' aria-current="page"' : ''}${item[3] ? ' target="_blank" rel="noopener noreferrer"' : ''}>${item[1]}</a>`).join('')}</nav>
    <div class="site-shell-search" role="search">
      <input id="shellSearch" type="search" placeholder="请输入内容" autocomplete="off">
      <div class="site-shell-engine"><button id="shellEngine" type="button">🔍 百度⌄</button><div id="shellMenu" class="site-shell-menu">${engines.map(item => `<button type="button" data-engine="${item[0]}">${item[1]}</button>`).join('')}</div></div>
      <button id="shellSearchButton" type="button">搜索</button>
    </div>
    <div class="site-shell-poem"><div id="shellPoem"></div><div id="shellPoemInfo"></div></div>`;
  // 一次性缓存所有需要反复访问的节点
  const time = document.getElementById('shellTime');
  const engineButton = document.getElementById('shellEngine');
  const menu = document.getElementById('shellMenu');
  const searchInput = document.getElementById('shellSearch');
  const searchButton = document.getElementById('shellSearchButton');
  const poemEl = document.getElementById('shellPoem');
  const poemInfoEl = document.getElementById('shellPoemInfo');
  const updateTime = () => { time.textContent = new Date().toLocaleTimeString(); };
  updateTime(); window.setInterval(updateTime, 1000);
  let engine = 'baidu';
  engineButton.addEventListener('click', () => menu.classList.toggle('is-open'));
  menu.querySelectorAll('[data-engine]').forEach(button => button.addEventListener('click', () => {
    engine = button.dataset.engine; engineButton.textContent = button.textContent + '⌄'; menu.classList.remove('is-open');
  }));
  function search() {
    const query = searchInput.value.trim(); if (!query) return;
    window.open((urls[engine] || urls.baidu) + encodeURIComponent(query), '_blank', 'noopener');
  }
  searchButton.addEventListener('click', search);
  searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') search(); });
  const poemScript = document.createElement('script');
  poemScript.src = 'https://sdk.jinrishici.com/v2/browser/jinrishici.js';
  poemScript.onload = () => window.jinrishici?.load(result => {
    poemEl.textContent = result.data.content;
    poemInfoEl.textContent = `【${result.data.origin.dynasty}】${result.data.origin.author}《${result.data.origin.title}》`;
  });
  document.head.appendChild(poemScript);
})();
