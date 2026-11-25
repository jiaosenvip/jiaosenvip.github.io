/* 首页筛选与页脚年份：自 index.html 内联脚本迁移，行为保持不变。 */
(function () {
  'use strict';

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const siteSearch = document.getElementById('siteSearch');
  const categoryBar = document.getElementById('categoryBar');
  const siteCount = document.getElementById('siteCount');
  if (!siteSearch || !categoryBar || !siteCount) return;

  const categoryRules = [
    ['技术开发', /互联网|开发|Python|爬虫|开源|镜像|编程/i],
    ['AI 工具', /AI|人工智能/i],
    ['资讯阅读', /新闻|阅读|资讯|周刊|热榜/i],
    ['影音娱乐', /影视|游戏|独自升级/i],
    ['生活服务', /购物|旅游|生活/i],
    ['安全工具', /安全|工具/i]
  ];
  const getCategory = title => (categoryRules.find(item => item[1].test(title)) || [null, null])[0] || '其他';

  // 一次性缓存分组与链接，输入时不再重复查询 DOM
  const groups = Array.from(document.querySelectorAll('.content > .row > .subs')).map(group => ({
    el: group,
    category: getCategory(group.querySelector('.tit')?.textContent || ''),
    links: Array.from(group.querySelectorAll('.row.row-cols-2 > .col'))
  }));

  const categories = ['全部', ...new Set(groups.map(g => g.category))];
  const chips = categories.map(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-chip' + (category === '全部' ? ' active' : '');
    button.dataset.category = category;
    button.textContent = category;
    return button;
  });
  categoryBar.append(...chips);

  let activeCategory = '全部';
  function updateHomeFilter() {
    const keyword = siteSearch.value.trim().toLowerCase();
    let visibleGroups = 0;
    let visibleLinks = 0;
    groups.forEach(group => {
      const categoryMatched = activeCategory === '全部' || group.category === activeCategory;
      let groupLinks = 0;
      group.links.forEach(link => {
        const matched = !keyword || link.textContent.toLowerCase().includes(keyword);
        link.classList.toggle('is-hidden', !matched);
        if (matched) groupLinks += 1;
      });
      const groupMatched = categoryMatched && (!keyword || groupLinks > 0);
      group.el.classList.toggle('is-hidden', !groupMatched);
      if (groupMatched) { visibleGroups += 1; visibleLinks += groupLinks; }
    });
    chips.forEach(chip => chip.classList.toggle('active', chip.dataset.category === activeCategory));
    siteCount.textContent = keyword || activeCategory !== '全部'
      ? (visibleGroups + ' 个分类 · ' + visibleLinks + ' 个网址')
      : (groups.length + ' 个分类 · ' + visibleLinks + ' 个网址');
  }

  siteSearch.addEventListener('input', updateHomeFilter);
  categoryBar.addEventListener('click', event => {
    const chip = event.target.closest('.category-chip');
    if (!chip) return;
    activeCategory = chip.dataset.category;
    updateHomeFilter();
  });
  updateHomeFilter();
})();
