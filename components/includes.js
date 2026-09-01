/* ── CHAOSTUIN INCLUDES ──────────────────────────────────
   Laadt nav.html en footer.html in elke pagina (of de EN-varianten
   als de pagina onder /en/ staat).
   Gebruik:
     <div id="nav-placeholder"></div>   ← bovenaan <body>
     <div id="footer-placeholder"></div> ← onderaan <body>, voor </body>
     <script src="/components/includes.js"></script>
──────────────────────────────────────────────────────── */

(function() {

  const root = document.documentElement.dataset.root || '/';
  const isEnglish = window.location.pathname.startsWith('/en/');
  const navFile = isEnglish ? 'nav-en.html' : 'nav.html';
  const footerFile = isEnglish ? 'footer-en.html' : 'footer.html';

  function loadComponent(id, file, callback) {
    const el = document.getElementById(id);
    if (!el) return;
    fetch(root + 'components/' + file)
      .then(r => {
        if (!r.ok) throw new Error('Kon ' + file + ' niet laden');
        return r.text();
      })
      .then(html => {
        el.outerHTML = html;
        requestAnimationFrame(() => {
          if (callback) callback();
          if (file === navFile) {
            document.dispatchEvent(new Event('navLoaded'));
          }
        });
      })
      .catch(err => console.warn('Chaostuin includes:', err));
  }

  function fixNavLinks() {
    document.querySelectorAll('#nav a[href^="/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href.startsWith('/#')) {
        a.setAttribute('href', root + href.slice(1));
      }
    });
  }

  function markActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('#nav .nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('/#') && path.startsWith(href.replace(/\/$/, ''))) {
        a.classList.add('active');
      }
    });
  }

  function initHamburger() {
    const hamburger = document.getElementById('navHamburger');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('mobile-open');
    });

    navLinks.querySelectorAll('a').forEach(a => {
      if (!a.classList.contains('nav-dropdown-toggle')) {
        a.addEventListener('click', () => {
          hamburger.classList.remove('open');
          navLinks.classList.remove('mobile-open');
        });
      }
    });

    navLinks.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
      toggle.addEventListener('click', e => {
        if (window.innerWidth <= 600) {
          e.preventDefault();
          const dd = toggle.nextElementSibling;
          if (dd) dd.classList.toggle('open');
        }
      });
    });
  }

  /* ── TAALSCHAKELAAR ──────────────────────────────────────
     Berekent het pad van de equivalente pagina in de andere taal,
     zodat een bezoeker op dezelfde inhoud blijft in plaats van
     terug te vallen op de homepage. Als de vertaalde pagina nog
     niet bestaat, vangt /404.html of /en/404.html dat netjes op. */
  function getLangSwitchPath() {
    const path = window.location.pathname;
    if (isEnglish) {
      const stripped = path.replace(/^\/en/, '');
      return stripped === '' ? '/' : stripped;
    } else {
      return path === '/' ? '/en/' : '/en' + path;
    }
  }

  function initLangSwitch() {
    const btn = document.getElementById('langSwitch');
    if (!btn) return;
    btn.setAttribute('href', getLangSwitchPath());
  }

  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    onScroll();
    fixNavLinks();
    markActiveLink();
    initDropdowns();
    initHamburger();
    initLangSwitch();
  }

  function initDropdowns() {
    document.querySelectorAll('.nav-dropdown-item').forEach(item => {
      const dropdown = item.querySelector('.nav-dropdown');
      if (!dropdown) return;
      let closeTimer = null;
      function isOverItemOrDropdown(e) {
        const ib = item.getBoundingClientRect(), db = dropdown.getBoundingClientRect();
        const x = e.clientX, y = e.clientY;
        return (x >= ib.left && x <= ib.right && y >= ib.top && y <= ib.bottom) ||
               (x >= db.left && x <= db.right && y >= db.top && y <= db.bottom);
      }
      item.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        dropdown.classList.add('open');
      });
      document.addEventListener('mousemove', e => {
        if (!dropdown.classList.contains('open')) return;
        clearTimeout(closeTimer);
        if (!isOverItemOrDropdown(e))
          closeTimer = setTimeout(() => dropdown.classList.remove('open'), 100);
      });
    });
  }

  function trackPageView() {
    const slug = window.location.pathname
      .replace(/^\/|\/$/g, '')
      .replace(/\//g, '-') || 'home'
      .replace(/\/index$/, '')   // "en/index" → "en", "aanpak/index" → "aanpak"
      .replace(/\.html$/, '');
      fetch(`https://api.counterapi.dev/v2/Grommelpaniek/page-${slug}/up`).catch(() => {});
  }
  function loadSearch() {
    const s = document.createElement('script');
    s.src = '/components/search.js';
    document.head.appendChild(s);
  }

  function init() {
    loadComponent('nav-placeholder', navFile, initNav);
    loadComponent('footer-placeholder', footerFile);
    loadSearch();
    trackPageView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
