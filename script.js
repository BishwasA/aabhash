(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NE = {
    'Learn. Prepare. Stay Informed.': 'सिक्नुहोस्। तयारी गर्नुहोस्। जानकार रहनुहोस्।', 'Forest Service Nepal': 'वन सेवा नेपाल',
    'Home': 'गृहपृष्ठ', 'Loksewa': 'लोकसेवा', 'Laws & Acts': 'ऐन तथा कानुन', 'Blog/Articles': 'ब्लग/लेख', 'News': 'समाचार', 'Opportunities': 'अवसरहरू',
    'Annual Schedule': 'वार्षिक तालिका', 'Syllabus': 'पाठ्यक्रम', 'Federal': 'संघीय', 'Highlights': 'मुख्य बुँदा',
    'A place to learn, prepare and stay informed.': 'सिक्न, तयारी गर्न र जानकार रहन एउटा थलो।', 'Read More →': 'थप पढ्नुहोस् →',
    'LATEST WEBSITE ACTIVITY': 'वेबसाइटका पछिल्ला गतिविधि', 'Updates': 'अपडेटहरू', 'See All →': 'सबै हेर्नुहोस् →',
    'STUDY MATERIALS': 'अध्ययन सामग्री', 'Learning Resources': 'सिकाइ स्रोतहरू', 'Objective': 'वस्तुगत', 'Subjective': 'विषयगत',
    'Past Questions': 'पुराना प्रश्नपत्र', 'Related Materials': 'सम्बन्धित सामग्री', 'BSc Forestry': 'बीएस्सी वन विज्ञान', 'MSc Forestry': 'एमएस्सी वन विज्ञान',
    'ARTICLES & KNOWLEDGE': 'लेख र ज्ञान', 'Blog / Articles': 'ब्लग / लेख', 'LATEST INFORMATION': 'पछिल्ला जानकारी', 'Latest News': 'ताजा समाचार',
    'CAREER & FUNDING': 'करिअर र अनुदान', 'WATCH & LEARN': 'हेर्नुहोस् र सिक्नुहोस्', 'Videos': 'भिडियोहरू', 'DOWNLOADS & DOCUMENTS': 'डाउनलोड र कागजात',
    'Additional Resources': 'थप स्रोतहरू', 'Click here to submit Article/Blog →': 'लेख/ब्लग पठाउन यहाँ क्लिक गर्नुहोस् →',
    'Click here to submit News →': 'समाचार पठाउन यहाँ क्लिक गर्नुहोस् →', 'Connect With Us': 'हामीसँग जोडिनुहोस्',
    'All rights reserved.': 'सर्वाधिकार सुरक्षित।', 'Nothing published yet.': 'अहिलेसम्म केही प्रकाशित गरिएको छैन।',
    'Semester 1': 'सेमेस्टर १', 'Semester 2': 'सेमेस्टर २', 'Semester 3': 'सेमेस्टर ३', 'Semester 4': 'सेमेस्टर ४',
    'Semester 5': 'सेमेस्टर ५', 'Semester 6': 'सेमेस्टर ६', 'Semester 7': 'सेमेस्टर ७', 'Semester 8': 'सेमेस्टर ८'
  };
  let lang = localStorage.getItem('fsn_lang') || 'en';
  const orig = new WeakMap();
  const tr = k => (lang === 'ne' && NE[k]) || k;
  const title = i => (lang === 'ne' && i.title_ne) || i.title;

  function translateStatic() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (n.parentElement.closest('[data-dyn],script')) continue;
      if (!orig.has(n)) orig.set(n, n.nodeValue);
      const o = orig.get(n), k = o.trim().replace(/\s+/g, ' ');
      if (NE[k]) n.nodeValue = lang === 'ne' ? o.replace(o.trim(), NE[k]) : o;
    }
    document.documentElement.lang = lang;
    $$('.language-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }

  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === 'class' ? e.className = v : e.setAttribute(k, v);
    kids.forEach(c => e.append(c)); return e;
  }
  const fmtDate = d => new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
  const href = i => (i.url && ['resource', 'video', 'opportunity', 'update', 'highlight'].includes(i.type) && !(i.body && i.type !== 'resource')) ? i.url : 'page.html?id=' + i.id;
  const ytId = u => (u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/) || [])[1];

  function card(i) {
    const a = el('a', { class: 'item-card', href: href(i) });
    const th = el('div', { class: 'item-thumb' });
    const y = i.type === 'video' && ytId(i.url || '');
    if (y) th.style.backgroundImage = `url(https://img.youtube.com/vi/${y}/hqdefault.jpg)`; else th.textContent = i.type === 'video' ? '▶' : '';
    const b = el('div', { class: 'item-body' }, el('span', { class: 'item-date' }, i.date), el('h3', {}, title(i)));
    if (i.summary) b.append(el('p', {}, i.summary));
    a.append(th, b); return a;
  }

  let cache = null;
  async function load() {
    try { cache = await (await fetch('/api/items')).json(); } catch { cache = []; }
    render();
  }
  function render() {
    const by = t => cache.filter(i => i.type === t);
    $$('[data-portal]').forEach(g => {
      g.dataset.dyn = 1;
      const map = { articles: 'article', news: 'news', opportunities: 'opportunity', videos: 'video' };
      const list = by(map[g.dataset.portal]).slice(0, 4);
      g.replaceChildren(...(list.length ? list.map(card) : [el('p', { class: 'empty' }, tr('Nothing published yet.'))]));
    });
    const ups = by('update').slice(0, 5), ul = $('.updates-list');
    if (ul) {
      ul.dataset.dyn = 1;
      ul.replaceChildren(...(ups.length ? ups.map(i => el('a', { class: 'update-item', href: href(i) },
        el('span', { class: 'update-date' }, fmtDate(i.date)), el('span', { class: 'update-title' }, title(i)), el('span', { class: 'update-arrow' }, '→')))
        : [el('p', { class: 'update-empty' }, tr('Nothing published yet.'))]));
    }
    const hl = by('highlight'), tt = $('.ticker-track');
    if (tt) {
      tt.dataset.dyn = 1;
      const links = hl.map(i => el('a', { href: href(i) }, title(i)));
      tt.replaceChildren(...(links.length ? [...links, ...links.map(l => l.cloneNode(true))] : [el('span', {}, tr('Nothing published yet.'))]));
    }
    const rs = by('resource').slice(0, 8), rg = $('.resource-grid');
    if (rg) {
      rg.dataset.dyn = 1;
      rg.replaceChildren(...(rs.length ? rs.map(i => el('a', { class: 'additional-card', href: i.url || ('page.html?id=' + i.id), ...(i.url ? { target: '_blank', rel: 'noopener' } : {}) },
        el('span', { class: 'resource-icon' }, i.fileType || 'PDF'), el('span', {}, el('strong', {}, title(i)), el('small', {}, i.url ? 'Download →' : 'View →'))))
        : [el('p', { class: 'empty' }, tr('Nothing published yet.'))]));
    }
  }

  async function loadSocialLinks() {
    const section = $('.footer-social'), container = $('[data-social]');
    if (!container) return;
    try {
      const response = await fetch('/api/social');
      if (!response.ok) throw new Error('Could not load social links.');
      const links = await response.json();
      container.replaceChildren(...links.map(link => {
        const anchor = el('a', {
          href: link.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': link.name, title: link.name
        });
        if (link.imageUrl) anchor.append(el('img', { src: link.imageUrl, alt: '', class: 'social-link-image' }));
        else anchor.append(el('i', { class: link.iconClass, 'aria-hidden': 'true' }));
        return anchor;
      }));
      if (section) section.hidden = links.length === 0;
    } catch (error) {
      console.error(error);
      if (section) section.hidden = true;
    }
  }

  // "See All" and "submit" links
  const seeAll = ['update', 'article', 'news', 'opportunity', 'video', 'resource'];
  $$('.see-all').forEach((a, n) => a.href = 'page.html?type=' + seeAll[n]);
  $$('.submit-link').forEach((a, n) => a.href = 'page.html?submit=' + (n ? 'news' : 'article'));
  const ra = $('.text-link'); if (ra) ra.href = '#articles';

  // misc UI
  const d = $('#current-date'); if (d) d.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const y = $('#copyright-year'); if (y) y.textContent = new Date().getFullYear();
  $$('.language-btn').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; localStorage.setItem('fsn_lang', lang); translateStatic(); if (cache) render(); }));
  const navPanel = $('#nav-content-panel'), navPanelInner = $('.nav-content-inner', navPanel);
  const dropdownButtons = $$('.main-nav .dropdown-button');
  let openedDropdown = null;
  const closeNavPanel = () => {
    if (!navPanel || !navPanelInner) return;
    navPanel.hidden = true;
    navPanelInner.replaceChildren();
    dropdownButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      button.classList.toggle('active', button.dataset.section === activeSection);
    });
    openedDropdown = null;
  };
  dropdownButtons.forEach(button => button.addEventListener('click', () => {
    if (!navPanel || !navPanelInner) return;
    if (openedDropdown === button) { closeNavPanel(); return; }
    const menu = button.parentElement.querySelector('.dropdown-menu');
    if (!menu) return;
    closeNavPanel();
    const title = button.textContent.replace('▾', '').trim();
    const closeButton = el('button', { class: 'nav-panel-close', type: 'button', 'aria-label': 'Close ' + title + ' menu' }, 'Close');
    closeButton.addEventListener('click', closeNavPanel);
    navPanelInner.append(
      el('div', { class: 'nav-panel-heading' }, el('h2', {}, title), closeButton),
      menu.cloneNode(true)
    );
    navPanel.hidden = false;
    openedDropdown = button;
    button.setAttribute('aria-expanded', 'true');
    button.classList.add('active');
  }));
  navPanel?.addEventListener('click', event => {
    if (event.target.closest('a[href="#"]')) event.preventDefault();
  });
  document.addEventListener('click', event => {
    if (openedDropdown && !event.target.closest('.nav-item') && !event.target.closest('#nav-content-panel')) closeNavPanel();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && openedDropdown) {
      const trigger = openedDropdown;
      closeNavPanel();
      trigger.focus();
    }
  });
  const searchButton = $('.search-button'), searchForm = $('#site-search-form'), searchInput = $('#site-search-input');
  const closeSearch = () => {
    if (!searchForm || !searchButton) return;
    searchForm.hidden = true;
    searchButton.setAttribute('aria-expanded', 'false');
  };
  if (searchButton && searchForm && searchInput) {
    searchButton.addEventListener('click', () => {
      searchForm.hidden = !searchForm.hidden;
      searchButton.setAttribute('aria-expanded', String(!searchForm.hidden));
      if (!searchForm.hidden) searchInput.focus();
    });
    searchForm.addEventListener('submit', event => {
      event.preventDefault();
      const query = searchInput.value.trim();
      if (query) location.href = 'page.html?q=' + encodeURIComponent(query);
    });
    $('.site-search-close', searchForm).addEventListener('click', closeSearch);
    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') { closeSearch(); searchButton.focus(); }
    });
  }

  const sectionLinks = $$('.main-nav [data-section]');
  let activeSection = location.hash.slice(1) || 'home';
  const setActiveSection = id => {
    activeSection = id;
    sectionLinks.forEach(link => link.classList.toggle('active',
      link.dataset.section === id || (link.classList.contains('dropdown-button') && link.getAttribute('aria-expanded') === 'true')));
  };
  setActiveSection(activeSection);
  sectionLinks.filter(link => link.tagName === 'A').forEach(link => link.addEventListener('click', () => {
    if (link.dataset.section) setActiveSection(link.dataset.section);
  }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const current = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) setActiveSection(current.target.id);
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.1, 0.5, 1] });
    ['home', 'learning', 'articles', 'news', 'opportunities'].forEach(id => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  window.FSN = { el, card, title: () => lang, tr, getLang: () => lang };
  translateStatic(); load(); loadSocialLinks();
})();
