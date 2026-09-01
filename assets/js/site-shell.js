(function () {
  const current = location.pathname.split('/').pop() || 'index.html';
  const items = [
    ['/', '首页', current === '' || current === 'index.html'],
    ['/tools.html', '在线工具', current === 'tools.html']
  ];
  const engines = [
    ['yandex', '🔍 Yandex'], ['bing', '🔍 必应'], ['google', '🔍 谷歌'],
    ['baidu', '🔍 百度'], ['sogou', '🔍 搜狗'], ['baiduai', '🤖 百度 AI 搜索'],
    ['nami', '🤖 纳米 AI 搜索'], ['tiangong', '🤖 天工 AI 搜索'],
    ['metaso', '🤖 秘塔 AI 搜索'], ['wiki', '📖 维基百科'], ['github', '📖 GitHub']
  ];
  const shell = document.getElementById('siteShell');
  if (!shell) return;
  const now = new Date();
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  shell.className = 'site-shell';
  shell.innerHTML = `
    <div class="site-shell-date"><a href="/">${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${weekdays[now.getDay()]}</a><span id="shellTime" class="site-shell-time"></span></div>
    <nav class="site-shell-nav" aria-label="站点导航">${items.map(item => `<a href="${item[0]}"${item[2] ? ' aria-current="page"' : ''}>${item[1]}</a>`).join('')}</nav>
    <div class="site-shell-search" role="search">
      <input id="shellSearch" type="search" placeholder="请输入内容" autocomplete="off">
      <div class="site-shell-engine"><button id="shellEngine" type="button">🔍 百度⌄</button><div id="shellMenu" class="site-shell-menu">${engines.map(item => `<button type="button" data-engine="${item[0]}">${item[1]}</button>`).join('')}</div></div>
      <button id="shellSearchButton" type="button">搜索</button>
    </div>
    <div class="site-shell-poem"><div id="shellPoem"></div><div id="shellPoemInfo"></div></div>`;
  const time = document.getElementById('shellTime');
  const updateTime = () => { time.textContent = new Date().toLocaleTimeString(); };
  updateTime(); window.setInterval(updateTime, 1000);
  let engine = 'baidu';
  const menu = document.getElementById('shellMenu');
  document.getElementById('shellEngine').addEventListener('click', () => menu.classList.toggle('is-open'));
  menu.querySelectorAll('[data-engine]').forEach(button => button.addEventListener('click', () => {
    engine = button.dataset.engine; document.getElementById('shellEngine').textContent = button.textContent + '⌄'; menu.classList.remove('is-open');
  }));
  function search() {
    const query = document.getElementById('shellSearch').value.trim(); if (!query) return;
    const encoded = encodeURIComponent(query);
    const urls = {
      baidu:`https://www.baidu.com/s?wd=${encoded}`, bing:`https://www.bing.com/search?q=${encoded}`,
      google:`https://www.google.com/search?q=${encoded}`, yandex:`https://yandex.com/search/?text=${encoded}`,
      sogou:`https://www.sogou.com/web?query=${encoded}`, github:`https://github.com/search?type=repositories&q=${encoded}`,
      baiduai:`https://chat.baidu.com/search?word=${encoded}`, nami:`https://n.cn/?q=${encoded}`,
      tiangong:`https://tiangong.cn/result/?q=${encoded}`, metaso:`https://metaso.cn/?q=${encoded}`,
      wiki:`https://zh.wikipedia.org/wiki/${encoded}`
    };
    window.open(urls[engine] || urls.baidu, '_blank', 'noopener');
  }
  document.getElementById('shellSearchButton').addEventListener('click', search);
  document.getElementById('shellSearch').addEventListener('keydown', event => { if (event.key === 'Enter') search(); });
  const poemScript = document.createElement('script');
  poemScript.src = 'https://sdk.jinrishici.com/v2/browser/jinrishici.js';
  poemScript.onload = () => window.jinrishici?.load(result => {
    document.getElementById('shellPoem').textContent = result.data.content;
    document.getElementById('shellPoemInfo').textContent = `【${result.data.origin.dynasty}】${result.data.origin.author}《${result.data.origin.title}》`;
  });
  document.head.appendChild(poemScript);
})();
