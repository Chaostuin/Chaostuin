/* ── CHAOSTUIN INCLUDES ──────────────────────────────────
   Laadt nav.html en footer.html in elke pagina.
   Gebruik:
     <div id="nav-placeholder"></div>   ← bovenaan <body>
     <div id="footer-placeholder"></div> ← onderaan <body>, voor </body>
     <script src="/components/includes.js"></script>
──────────────────────────────────────────────────────── */

(function() {

  const root = document.documentElement.dataset.root || '/';

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
          if (file === 'nav.html') {
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
        a.setAttribute('href', root + 'index.html' + href.substring(1));
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

  function loadSearch() {
    const s = document.createElement('script');
    s.src = '/components/search.js';
    document.head.appendChild(s);
  }

  function init() {
    loadComponent('nav-placeholder', 'nav.html', initNav);
    loadComponent('footer-placeholder', 'footer.html');
    loadSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
