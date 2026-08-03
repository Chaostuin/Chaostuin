/* ── CHAOSTUIN ZOEKFUNCTIE ───────────────────────────────
   Laadt begrippen.json (of begrippen-en.json op /en/) en koppelt
   de zoekbalk in de nav.
   Wordt automatisch geladen door includes.js na navLoaded.
──────────────────────────────────────────────────────── */

(function() {

  const isEnglish = window.location.pathname.startsWith('/en/');
  const STORAGE_KEY = isEnglish ? 'chaostuin_missed_words_en' : 'chaostuin_missed_words';
  const DATA_FILE = isEnglish ? '/data/begrippen-en.json' : '/data/begrippen.json';
  const LOCALE = isEnglish ? 'en-US' : 'nl-BE';

  const t = isEnglish ? {
    missedTitle: (n) => n + ' missed search term(s) — click to export',
    exportHeader: 'Missed search terms on chaostuin.be',
    exportedOn: 'Exported on: ',
    exportFilename: 'chaostuin_missed_words_',
    noResult: (q) => 'No result for <strong>"' + q + '"</strong>',
    noResultNote: 'We remember this — it will be added.'
  } : {
    missedTitle: (n) => n + ' niet-gevonden zoekterm(en) — klik om te exporteren',
    exportHeader: 'Niet-gevonden zoektermen op chaostuin.be',
    exportedOn: 'Geëxporteerd op: ',
    exportFilename: 'chaostuin_ontbrekende_woorden_',
    noResult: (q) => 'Geen resultaat voor <strong>"' + q + '"</strong>',
    noResultNote: 'We onthouden dit — Hij voegt het toe.'
  };

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
      missedBtn.title = t.missedTitle(missed.length);
    } else {
      missedBtn.classList.remove('has-items');
    }
  }

  function exportMissed() {
    const missed = getMissed();
    if (!missed.length) return;
    const lines = [t.exportHeader, '='.repeat(40), ''];
    missed.sort((a,b) => b.count - a.count)
          .forEach(m => lines.push(m.count + 'x  ' + m.woord + '  (' + m.datum + ')'));
    lines.push('', t.exportedOn + new Date().toLocaleString(LOCALE));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = t.exportFilename + new Date().toISOString().slice(0,10) + '.txt';
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
          '<div class="search-not-found">' + t.noResult(q) +
          '<br><span style="font-size:0.8em;opacity:0.7;">' + t.noResultNote + '</span></div>';
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
    fetch(DATA_FILE)
      .then(r => r.json())
      .then(begrippen => initSearch(begrippen))
      .catch(err => console.warn(DATA_FILE + ' kon niet geladen worden:', err));
  });

})();
