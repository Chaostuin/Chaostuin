/* ── CHAOSTUIN INCLUDES ──────────────────────────────────
   Laadt nav.html en footer.html in elke pagina.
   Gebruik:
     <div id="nav-placeholder"></div>   ← bovenaan <body>
     <div id="footer-placeholder"></div> ← onderaan <body>, voor </body>
     <script src="/components/includes.js"></script>
──────────────────────────────────────────────────────── */

(function() {

  // Bepaal het pad naar /components/ relatief aan de root
  // zodat het werkt vanuit /, /aanpak/, /tools/, enz.
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
        // Wacht één frame zodat de browser de nieuwe HTML heeft verwerkt
        requestAnimationFrame(() => {
          if (callback) callback();
          if (file === 'nav.html') {
            document.dispatchEvent(new Event('navLoaded'));
          }
        });
      })
      .catch(err => console.warn('Chaostuin includes:', err));
  }

  // Pas alle nav-links aan op basis van data-root
  function fixNavLinks() {
    document.querySelectorAll('#nav a[href^="/"]').forEach(a => {
      const href = a.getAttribute('href');
      // /index.html en /tools/... blijven absoluut — werkt altijd via localhost
      // Alleen /#hash-links omzetten naar root + index.html#hash
      if (href.startsWith('/#')) {
        a.setAttribute('href', root + 'index.html' + href.substring(1));
      }
    });
  }

  // Markeer actieve nav-link op basis van huidige URL
  function markActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('#nav .nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('/#') && path.startsWith(href.replace(/\/$/, ''))) {
        a.classList.add('active');
      }
    });
  }

  // Nav scroll-gedrag opnieuw activeren na inject
  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    onScroll();
    fixNavLinks();
    markActiveLink();
    initDropdowns();
  }

  // Dropdown via JS - controleert of muis nog in het gebied is
  function initDropdowns() {
    document.querySelectorAll('.nav-dropdown-item').forEach(item => {
      const dropdown = item.querySelector('.nav-dropdown');
      if (!dropdown) return;

      let closeTimer = null;

      function isOverItemOrDropdown(e) {
        const itemBox     = item.getBoundingClientRect();
        const dropBox     = dropdown.getBoundingClientRect();
        const x = e.clientX, y = e.clientY;
        const overItem    = x >= itemBox.left && x <= itemBox.right && y >= itemBox.top  && y <= itemBox.bottom;
        const overDrop    = x >= dropBox.left && x <= dropBox.right && y >= dropBox.top  && y <= dropBox.bottom;
        return overItem || overDrop;
      }

      item.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        dropdown.classList.add('open');
      });

      document.addEventListener('mousemove', (e) => {
        if (!dropdown.classList.contains('open')) return;
        clearTimeout(closeTimer);
        if (!isOverItemOrDropdown(e)) {
          closeTimer = setTimeout(() => dropdown.classList.remove('open'), 100);
        }
      });
    });
  }

  function init() {
    loadComponent('nav-placeholder', 'nav.html', initNav);
    loadComponent('footer-placeholder', 'footer.html');
  }

  // Als het script onderaan de pagina staat is DOMContentLoaded al voorbij
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
