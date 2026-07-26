/* ── CHAOSTUIN ZOEKFUNCTIE ───────────────────────────────
   Laadt begrippen.json en koppelt de zoekbalk in de nav.
   Wordt automatisch geladen door includes.js na navLoaded.
──────────────────────────────────────────────────────── */

(function() {

  const STORAGE_KEY = 'chaostuin_missed_words';

  function getMissed() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function saveMissed(word) {
    const missed = getMissed();
    const clean = word.trim().toLowerCase();
    if (clean.length < 2) return;
    const existing = missed.find(m => m.woord === clean);
    if (!existing) {
      missed.push({ woord: clean, datum: new Date().toISOString().slice(0,10), count: 1 });
    } else {
      existing.count++;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(missed));
    updateMissedBtn();
  }

  function updateMissedBtn() {
    const missedBtn = document.getElementById('missedBtn');
    if (!missedBtn) return;
    const missed = getMissed();
    if (missed.length > 0) {
      missedBtn.classList.add('has-items');
      missedBtn.title = missed.length + ' niet-gevonden zoekterm(en) — klik om te exporteren';
    } else {
      missedBtn.classList.remove('has-items');
    }
  }

  function exportMissed() {
    const missed = getMissed();
    if (!missed.length) return;
    const lines = ['Niet-gevonden zoektermen op chaostuin.be', '='.repeat(40), ''];
    missed.sort((a,b) => b.count - a.count)
          .forEach(m => lines.push(m.count + 'x  ' + m.woord + '  (' + m.datum + ')'));
    lines.push('', 'Geëxporteerd op: ' + new Date().toLocaleString('nl-BE'));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chaostuin_ontbrekende_woorden_' + new Date().toISOString().slice(0,10) + '.txt';
    a.click();
  }

  function zoek(begrippen, query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return begrippen.filter(b =>
      b.woord.toLowerCase().includes(q) ||
      b.omschrijving.toLowerCase().includes(q) ||
      b.tag.toLowerCase().includes(q) ||
      (b.synoniem && b.synoniem.toLowerCase().includes(q))
    ).slice(0, 6);
  }

  function initSearch(begrippen) {
    const input     = document.getElementById('searchInput');
    const dropdown  = document.getElementById('searchDropdown');
    const missedBtn = document.getElementById('missedBtn');
    if (!input || !dropdown || !missedBtn) return;

    missedBtn.addEventListener('click', exportMissed);
    updateMissedBtn();

    let missedTimer = null;

    input.addEventListener('input', function() {
      const q = this.value.trim();
      clearTimeout(missedTimer);

      if (!q) { dropdown.classList.remove('open'); return; }

      const results = zoek(begrippen, q);
      dropdown.innerHTML = '';

      if (results.length > 0) {
        results.forEach(r => {
          const a = document.createElement('a');
          a.className = 'search-result-item';
          a.href = r.url;
          a.innerHTML =
            '<span style="flex:1">' + r.woord +
            ' <span style="font-size:0.8em;color:rgba(245,240,232,0.4);">— ' + r.omschrijving + '</span></span>' +
            '<span class="search-result-tag">' + r.tag + '</span>';
          a.addEventListener('click', () => {
            dropdown.classList.remove('open');
            input.value = '';
          });
          dropdown.appendChild(a);
        });
      } else {
        dropdown.innerHTML =
          '<div class="search-not-found">Geen resultaat voor <strong>"' + q + '"</strong>' +
          '<br><span style="font-size:0.8em;opacity:0.7;">We onthouden dit — Hij voegt het toe.</span></div>';
        missedTimer = setTimeout(() => saveMissed(q), 1500);
      }

      dropdown.classList.add('open');
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { dropdown.classList.remove('open'); input.value = ''; }
      if (e.key === 'Enter') {
        const q = this.value.trim();
        const results = zoek(begrippen, q);
        if (results.length > 0) {
          window.location.href = results[0].url;
          dropdown.classList.remove('open');
          input.value = '';
        } else {
          saveMissed(q);
        }
      }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.nav-search')) dropdown.classList.remove('open');
    });
  }

  // Start zodra de nav geladen is
  document.addEventListener('navLoaded', function() {
    fetch('/data/begrippen.json')
      .then(r => r.json())
      .then(begrippen => initSearch(begrippen))
      .catch(err => console.warn('begrippen.json kon niet geladen worden:', err));
  });

})();
