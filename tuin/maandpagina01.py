#!/usr/bin/env python3
"""
maandpagina.py - maakt de pagina van de lopende maand aan, of voegt er een
reel (of de inleiding) aan toe.

Zet dit bestand in dezelfde map als maand-sjabloon.html en de pagina's
(JJJJ-MM.html). Daarna:

    python maandpagina.py            -> de lopende maand
    python maandpagina.py 2026-11    -> een andere maand (bv. om te testen)

Enkel de standaardbibliotheek, geen AI. Het script schrijft alleen lokaal in
deze map en publiceert niets: het uploaden doe je zelf.
"""

import datetime
import html
import re
import shutil
import sys
from pathlib import Path

MAP = Path(__file__).resolve().parent
SJABLOON = MAP / "maand-sjabloon.html"

MAANDEN = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
]

# Instagram's eigen embedcode (zoals in je septemberpagina), met de code van
# de reel als invulplek. @@SOORT@@ is "reel" (of "p" voor een gewone post).
EMBED_SJABLOON = r"""<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/@@SOORT@@/@@CODE@@/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/@@SOORT@@/@@CODE@@/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Dit bericht op Instagram bekijken</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/@@SOORT@@/@@CODE@@/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">Een bericht gedeeld door De chaostuinier (@chaostuin)</a></p></div></blockquote>"""


class PaginaFout(Exception):
    """Iets klopt niet; er wordt niets weggeschreven."""


# --------------------------------------------------------------------------
# Maanden en links
# --------------------------------------------------------------------------

def maand_label(jjjj_mm):
    jaar, maand = jjjj_mm.split("-")
    return f"{MAANDEN[int(maand) - 1].capitalize()} {jaar}"


def vorige_maand(jjjj_mm):
    jaar, maand = (int(x) for x in jjjj_mm.split("-"))
    maand -= 1
    if maand == 0:
        jaar, maand = jaar - 1, 12
    return f"{jaar:04d}-{maand:02d}"


REEL_RE = re.compile(
    r"^https?://(?:www\.)?instagram\.com/(?:[A-Za-z0-9_.]+/)?(reel|reels|p)/([A-Za-z0-9_-]+)/?$"
)


def parse_reel_link(invoer):
    """Geeft (soort, code) terug, of gooit PaginaFout bij een ongeldige link."""
    link = invoer.strip().split("?")[0].split("#")[0]
    m = REEL_RE.match(link)
    if not m:
        raise PaginaFout(
            "Dit is geen geldige Instagram-link. Verwacht: "
            "https://www.instagram.com/reel/CODE/"
        )
    soort = "reel" if m.group(1) in ("reel", "reels") else "p"
    return soort, m.group(2)


# --------------------------------------------------------------------------
# Bouwstenen van de pagina
# --------------------------------------------------------------------------

def bouw_reel_blok(soort, code, bijschrift):
    embed = EMBED_SJABLOON.replace("@@SOORT@@", soort).replace("@@CODE@@", code)
    regels = ['    <div class="reel-block">', f"      {embed}"]
    if bijschrift:
        regels.append(
            f'      <p class="reel-caption">{html.escape(bijschrift, quote=False)}</p>'
        )
    regels.append("    </div>")
    return "\n".join(regels)


def bouw_intro_blok(tekst):
    return (
        '<div class="content-section">\n'
        "    <p>\n"
        f"      {html.escape(tekst, quote=False)}\n"
        "    </p>\n"
        "  </div>"
    )


# --------------------------------------------------------------------------
# Structuur van de pagina vinden (zonder een volledige HTML-parser)
# --------------------------------------------------------------------------

def maskeer_commentaar(tekst):
    """Vervangt commentaar door spaties van dezelfde lengte (posities blijven kloppen)."""
    return re.sub(r"<!--.*?-->", lambda m: " " * len(m.group()), tekst, flags=re.S)


def vind_sluit_div(gemaskeerd, start):
    """Index net na de </div> die bij de <div op positie `start` hoort."""
    diepte = 0
    for m in re.finditer(r"<div\b|</div\s*>", gemaskeerd[start:]):
        diepte += 1 if m.group().startswith("<div") else -1
        if diepte == 0:
            return start + m.end()
    raise PaginaFout("Een <div> in de pagina wordt nergens afgesloten.")


class Secties:
    pass


def vind_secties(tekst):
    g = maskeer_commentaar(tekst)
    starts = [m.start() for m in re.finditer(r'<div\s+class="content-section"', g)]
    if not starts:
        raise PaginaFout('Geen <div class="content-section"> in de pagina gevonden.')

    reel_pos = g.find('class="reel-block"')
    if reel_pos == -1:
        raise PaginaFout('Geen reel-blok (class="reel-block") in de pagina gevonden.')
    voor_reel = [s for s in starts if s < reel_pos]
    if not voor_reel:
        raise PaginaFout("Het reel-blok staat niet in een content-section.")

    s = Secties()
    s.container_start = max(voor_reel)
    s.container_tagend = g.index(">", s.container_start) + 1
    if not re.fullmatch(r'<div\s+class="content-section"\s*>', g[s.container_start:s.container_tagend]):
        raise PaginaFout("Het reel-gedeelte begint met een onverwachte <div>; ik durf het niet aan te passen.")
    einde = vind_sluit_div(g, s.container_start)
    s.container_sluit = g.rfind("</div", 0, einde)

    if starts[0] != s.container_start:
        s.intro_start = starts[0]
        s.intro_einde = vind_sluit_div(g, s.intro_start)
        if reel_pos < s.intro_einde:
            raise PaginaFout("Het inleidingsblok bevat een reel; onverwachte opbouw.")
    else:
        s.intro_start = None
        s.intro_einde = None
    return s


# --------------------------------------------------------------------------
# De drie bewerkingen
# --------------------------------------------------------------------------

def zet_inleiding(tekst, intro):
    """Vervangt de inleiding, of voegt ze toe als de pagina er nog geen heeft."""
    s = vind_secties(tekst)
    blok = bouw_intro_blok(intro)
    if s.intro_start is not None:
        return tekst[:s.intro_start] + blok + tekst[s.intro_einde:]
    lijn_start = tekst.rfind("\n", 0, s.container_start) + 1
    return tekst[:lijn_start] + "  " + blok + "\n\n" + tekst[lijn_start:]


def verwijder_inleiding(tekst):
    s = vind_secties(tekst)
    if s.intro_start is None:
        return tekst
    lijn_start = tekst.rfind("\n", 0, s.intro_start) + 1
    einde = s.intro_einde
    while einde < len(tekst) and tekst[einde] in " \t\r\n":
        einde += 1
    return tekst[:lijn_start] + "  " + tekst[einde:]


def voeg_reel_toe(tekst, soort, code, bijschrift):
    if re.search(rf"instagram\.com/(?:reel|p)/{re.escape(code)}/", tekst):
        raise PaginaFout("Deze reel staat al op de pagina.")
    s = vind_secties(tekst)
    blok = bouw_reel_blok(soort, code, bijschrift)
    binnen = tekst[s.container_tagend:s.container_sluit]
    m = re.search(r"\n[ \t]*<!--\s*Nog een reel", binnen)
    if m:
        pos = s.container_tagend + m.start()
    else:
        pos = len(tekst[:s.container_sluit].rstrip())
    return tekst[:pos] + "\n" + blok + tekst[pos:]


def maak_nieuwe_pagina(sjabloon, jjjj_mm, vorige_bestaat, intro, soort, code, bijschrift):
    t = sjabloon
    label = maand_label(jjjj_mm)

    # Uitleg-commentaar uit het sjabloon ([A]..[D] en de kop bovenaan) weg.
    t = re.sub(
        r"[ \t]*<!--(?:(?!-->).)*?\[[ABCD]\](?:(?!-->).)*?-->[ \t]*\n?",
        "", t, flags=re.S,
    )

    t, n = re.subn(
        r'(rel="canonical"[^>]*?/tuin/)\d{4}-\d{2}(\.html)',
        lambda m: m.group(1) + jjjj_mm + m.group(2), t,
    )
    if n != 1:
        raise PaginaFout("Sjabloon: canonical-link niet (precies één keer) gevonden.")

    t, n = re.subn(
        r"<title>.*?</title>",
        lambda m: f"<title>Chaostuin \u2014 {label} in de tuin</title>", t, flags=re.S,
    )
    if n != 1:
        raise PaginaFout("Sjabloon: <title> niet (precies één keer) gevonden.")

    t, n = re.subn(
        r'(<h1 class="page-title">).*?(</h1>)',
        lambda m: m.group(1) + label + m.group(2), t, flags=re.S,
    )
    if n != 1:
        raise PaginaFout('Sjabloon: <h1 class="page-title"> niet (precies één keer) gevonden.')

    vorige = vorige_maand(jjjj_mm)
    if vorige_bestaat:
        t, n = re.subn(
            r'(<a href="/tuin/)\d{4}-\d{2}(\.html" class="page-nav-up">).*?(</a>)',
            lambda m: m.group(1) + vorige + m.group(2) + "\u2190 " + maand_label(vorige) + m.group(3),
            t, flags=re.S,
        )
        if n != 1:
            raise PaginaFout("Sjabloon: de link naar de vorige maand (page-nav-up) niet gevonden.")
    else:
        t, n = re.subn(r'[ \t]*<nav class="page-nav">.*?</nav>[ \t]*\n?', "", t, flags=re.S)
        if n != 1:
            raise PaginaFout("Sjabloon: <nav class=\"page-nav\"> niet (precies één keer) gevonden.")

    # Het reel-gedeelte vervangen door de nieuwe reel.
    s = vind_secties(t)
    blok = bouw_reel_blok(soort, code, bijschrift)
    t = t[:s.container_tagend] + "\n\n" + blok + "\n\n  " + t[s.container_sluit:]

    # De inleiding invullen, of het hele blok weglaten.
    t = zet_inleiding(t, intro) if intro else verwijder_inleiding(t)
    return t


# --------------------------------------------------------------------------
# Controle
# --------------------------------------------------------------------------

VERBODEN_IN_NIEUWE_PAGINA = [
    "VOORBEELD", "Optioneel:", "Hier komt een korte inleiding", "SJABLOON",
    "[A]", "[B]", "[C]", "[D]",
]


def tel_reels(tekst):
    """Aantal echte reel-blokken (commentaar telt niet mee)."""
    return maskeer_commentaar(tekst).count('class="instagram-media"')


def controleer(tekst, verwacht_reels, nieuw=False, jjjj_mm=None, blokken=()):
    fouten = []
    g = maskeer_commentaar(tekst)  # tellen zonder de uitleg-commentaar
    n = g.count('class="instagram-media"')
    if n != verwacht_reels:
        fouten.append(f"{n} reel-blokken in de pagina, verwacht {verwacht_reels}.")
    p = g.count("data-instgrm-permalink=")
    if p != verwacht_reels:
        fouten.append(f"{p} permalinks in de pagina, verwacht {verwacht_reels}.")
    e = len(re.findall(r"<script[^>]*embed\.js", g))
    if e != 1:
        fouten.append(f"{e} embed.js-scripts in de pagina, verwacht precies 1.")
    if g.count("<div") != g.count("</div>"):
        fouten.append(
            f"<div>-tags kloppen niet: {g.count('<div')} geopend, "
            f"{g.count('</div>')} gesloten."
        )
    for blok in blokken:
        if blok not in tekst:
            fouten.append("Een nieuw blok staat niet in het eindresultaat.")
    if nieuw:
        for woord in VERBODEN_IN_NIEUWE_PAGINA:
            if woord in tekst:
                fouten.append(f"Sjabloontekst over in de nieuwe pagina: {woord}")
        if jjjj_mm:
            label = maand_label(jjjj_mm)
            if f"/tuin/{jjjj_mm}.html" not in tekst:
                fouten.append("Canonical-link bevat niet de juiste maand.")
            if f"<title>Chaostuin \u2014 {label} in de tuin</title>" not in tekst:
                fouten.append("<title> bevat niet de juiste maand.")
            if f'<h1 class="page-title">{label}</h1>' not in tekst:
                fouten.append("<h1> bevat niet de juiste maand.")
    return fouten


# --------------------------------------------------------------------------
# Lezen en schrijven (met backup en nacontrole)
# --------------------------------------------------------------------------

def lees(pad):
    ruw = pad.read_bytes().decode("utf-8")
    return ruw.replace("\r\n", "\n"), "\r\n" in ruw


def schrijf(pad, tekst, crlf):
    pad.write_bytes((tekst.replace("\n", "\r\n") if crlf else tekst).encode("utf-8"))


def bewaar(pad, nieuwe_tekst, crlf):
    backup = None
    if pad.exists():
        backup = pad.with_name(pad.name + ".bak")
        shutil.copy2(pad, backup)
    schrijf(pad, nieuwe_tekst, crlf)
    terug, _ = lees(pad)
    if terug != nieuwe_tekst:
        if backup is not None:
            shutil.copy2(backup, pad)
        else:
            pad.unlink()
        raise PaginaFout("Wegschrijven niet geslaagd (inhoud klopt niet); teruggezet.")
    return backup


# --------------------------------------------------------------------------
# Het gesprek met jou
# --------------------------------------------------------------------------

def vraag(prompt):
    try:
        return input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        print("\nAfgebroken, niets gewijzigd.")
        sys.exit(0)


def vraag_reel():
    while True:
        invoer = vraag("Link van de reel (leeg = stoppen): ")
        if not invoer:
            print("Gestopt, niets gewijzigd.")
            sys.exit(0)
        try:
            return parse_reel_link(invoer)
        except PaginaFout as fout:
            print(fout)


def bevestig():
    return vraag("Wegschrijven? (j/n): ").lower() in ("j", "ja")


def werk_nieuwe_pagina(jjjj_mm, pad):
    if not SJABLOON.exists():
        raise PaginaFout(f"{SJABLOON.name} staat niet in {MAP}.")
    sjabloon, crlf = lees(SJABLOON)
    vorige = vorige_maand(jjjj_mm)
    vorige_bestaat = (MAP / f"{vorige}.html").exists()

    print(f"De pagina {pad.name} ({maand_label(jjjj_mm)}) bestaat nog niet; ik maak ze aan.")
    if not vorige_bestaat:
        print(f"Let op: {vorige}.html staat niet in deze map; de link naar de vorige maand laat ik weg.")
    print()
    intro = vraag("Inleiding van de maand (leeg = overslaan): ")
    soort, code = vraag_reel()
    bijschrift = vraag("Zinnetje onder de reel (leeg = geen): ")

    nieuw = maak_nieuwe_pagina(sjabloon, jjjj_mm, vorige_bestaat, intro, soort, code, bijschrift)
    blok = bouw_reel_blok(soort, code, bijschrift)
    fouten = controleer(nieuw, 1, nieuw=True, jjjj_mm=jjjj_mm, blokken=[blok])
    if fouten:
        raise PaginaFout("Controle mislukt, niets weggeschreven:\n- " + "\n- ".join(fouten))

    print(f"\nNieuwe pagina {pad.name}: inleiding {'ja' if intro else 'nee'}, "
          f"1 reel ({code}), bijschrift {'ja' if bijschrift else 'nee'}.")
    if not bevestig():
        print("Niets weggeschreven.")
        return
    bewaar(pad, nieuw, crlf)
    print(f"Klaar: {pad.name} is aangemaakt. Upload het bestand naar /tuin/.")


def werk_bestaande_pagina(jjjj_mm, pad):
    tekst, crlf = lees(pad)
    aantal = tel_reels(tekst)
    s = vind_secties(tekst)
    print(f"{pad.name} bestaat al ({aantal} reel(s), inleiding {'ja' if s.intro_start is not None else 'nee'}).")
    print("  1 = een reel toevoegen")
    print("  2 = de inleiding toevoegen of wijzigen")
    keuze = vraag("Keuze (leeg = stoppen): ")

    if keuze == "1":
        soort, code = vraag_reel()
        bijschrift = vraag("Zinnetje onder de reel (leeg = geen): ")
        nieuw = voeg_reel_toe(tekst, soort, code, bijschrift)
        blok = bouw_reel_blok(soort, code, bijschrift)
        fouten = controleer(nieuw, aantal + 1, blokken=[blok])
        samenvatting = f"Reel {aantal + 1} ({code}) toevoegen aan {pad.name}."
    elif keuze == "2":
        if s.intro_start is not None:
            huidig = re.sub(r"<[^>]+>", " ", tekst[s.intro_start:s.intro_einde])
            huidig = re.sub(r"\s+", " ", html.unescape(huidig)).strip()
            print(f"Huidige inleiding: {huidig}")
        intro = vraag("Nieuwe inleiding (leeg = stoppen): ")
        if not intro:
            print("Gestopt, niets gewijzigd.")
            return
        nieuw = zet_inleiding(tekst, intro)
        fouten = controleer(nieuw, aantal, blokken=[bouw_intro_blok(intro)])
        samenvatting = f"Inleiding van {pad.name} {'wijzigen' if s.intro_start is not None else 'toevoegen'}."
    else:
        print("Gestopt, niets gewijzigd.")
        return

    if fouten:
        raise PaginaFout("Controle mislukt, niets weggeschreven:\n- " + "\n- ".join(fouten))
    print(f"\n{samenvatting}")
    if not bevestig():
        print("Niets weggeschreven.")
        return
    bewaar(pad, nieuw, crlf)
    print(f"Klaar. De oude versie staat in {pad.name}.bak. Upload {pad.name} naar /tuin/.")


def main():
    if len(sys.argv) > 1:
        jjjj_mm = sys.argv[1]
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", jjjj_mm):
            print("Gebruik: python maandpagina.py [JJJJ-MM], bv. 2026-11")
            return 1
    else:
        vandaag = datetime.date.today()
        jjjj_mm = f"{vandaag.year:04d}-{vandaag.month:02d}"

    pad = MAP / f"{jjjj_mm}.html"
    try:
        if pad.exists():
            werk_bestaande_pagina(jjjj_mm, pad)
        else:
            werk_nieuwe_pagina(jjjj_mm, pad)
    except PaginaFout as fout:
        print(f"\nFOUT: {fout}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
