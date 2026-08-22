#!/usr/bin/env node
/**
 * add-hreflang.js
 *
 * Voegt aan de <head> van elke HTML-pagina toe:
 *  - een zelfverwijzende <link rel="canonical"> (op ELKE pagina), zodat
 *    Google weet welke URL-variant (bv. met .html) de "officiële" is
 *    i.p.v. zelf te moeten raden tussen /pad en /pad.html.
 *  - <link rel="alternate" hreflang="..."> tags op pagina's die een
 *    NL/EN-tegenhanger hebben (zelfde koppel-logica als
 *    generate-sitemap.js: /aanpak/bodem.html <-> /en/aanpak/bodem.html).
 *
 * Idempotent: gebruikt een herkenbaar merker-blok, dus je kan dit script
 * gerust telkens opnieuw draaien (bv. samen met generate-sitemap.js vóór
 * elke commit) zonder dat de tags zich opstapelen.
 *
 * Gebruik:
 *   node add-hreflang.js
 */

const fs = require("fs");
const path = require("path");

// ---- Instellingen -----------------------------------------------------

const SITE_URL = "https://chaostuin.be";
const ROOT_DIR = process.cwd();

const EXCLUDE_DIRS = new Set(["components", ".git", "node_modules"]);
const EXCLUDE_FILENAMES = new Set(["404.html"]);

const MARKER_START = "<!-- seo:start (canonical + hreflang, auto-generated) -->";
const MARKER_END = "<!-- seo:end -->";

// Oudere merker-naam uit een vorige versie van dit script (vóór de
// canonical-tag werd toegevoegd) — wordt opgeruimd zodat er geen twee
// blokken naast elkaar blijven staan op pagina's waar het script al
// eerder draaide.
const LEGACY_MARKERS = [
  { start: "<!-- hreflang:start -->", end: "<!-- hreflang:end -->" },
];

// ---- Helpers (zelfde logica als generate-sitemap.js) --------------------

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      if (EXCLUDE_FILENAMES.has(entry.name)) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function toUrlPath(fullPath) {
  let rel = path.relative(ROOT_DIR, fullPath).split(path.sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"index.html".length);
  return "/" + rel;
}

function alternatesFor(urlPath, allUrlPaths) {
  let nlPath, enPath;
  if (urlPath.startsWith("/en/")) {
    enPath = urlPath;
    nlPath = urlPath.slice(3);
    if (nlPath === "") nlPath = "/";
  } else {
    nlPath = urlPath;
    enPath = urlPath === "/" ? "/en/" : "/en" + urlPath;
  }
  const alternates = [];
  if (allUrlPaths.has(nlPath)) alternates.push({ hreflang: "nl", href: nlPath });
  if (allUrlPaths.has(enPath)) alternates.push({ hreflang: "en", href: enPath });
  // x-default: welke versie tonen aan bezoekers wiens taal niet matcht.
  // Engels heeft wereldwijd het grootste bereik, dus die krijgt voorrang;
  // val terug op NL als er (nog) geen EN-versie is.
  if (allUrlPaths.has(enPath)) {
    alternates.push({ hreflang: "x-default", href: enPath });
  } else if (allUrlPaths.has(nlPath)) {
    alternates.push({ hreflang: "x-default", href: nlPath });
  }
  return alternates;
}

function buildBlock(canonicalPath, alternates) {
  const lines = [MARKER_START];
  lines.push(`  <link rel="canonical" href="${SITE_URL}${canonicalPath}" />`);
  for (const alt of alternates) {
    lines.push(`  <link rel="alternate" hreflang="${alt.hreflang}" href="${SITE_URL}${alt.href}" />`);
  }
  lines.push(MARKER_END);
  return lines.join("\n");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLegacyBlocks(html) {
  let result = html;
  for (const { start, end } of LEGACY_MARKERS) {
    const legacyRegex = new RegExp(
      `[ \\t]*${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\n?`,
      "i"
    );
    result = result.replace(legacyRegex, "");
  }
  return result;
}

function upsertBlock(html, block) {
  html = stripLegacyBlocks(html);
  const markerRegex = new RegExp(
    `([ \\t]*)${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}\\n?`,
    "i"
  );
  if (markerRegex.test(html)) {
    // Bestaand blok vervangen, met behoud van de bestaande inspringing
    return html.replace(markerRegex, (_match, indent) => `${indent}${block}\n`);
  }
  // Nog geen blok: invoegen net na de openende <head ...> tag
  const headOpenRegex = /<head[^>]*>/i;
  if (!headOpenRegex.test(html)) {
    return null; // geen <head> gevonden — bestand overslaan
  }
  return html.replace(headOpenRegex, (match) => `${match}\n  ${block}`);
}

// ---- Hoofdlogica ---------------------------------------------------------

const files = walk(ROOT_DIR);
const urlPaths = files.map(toUrlPath);
const urlPathSet = new Set(urlPaths);

let updated = 0;
let withHreflang = 0;
let skippedNoHead = 0;

files.forEach((fullPath, i) => {
  const urlPath = urlPaths[i];
  const allAlternates = alternatesFor(urlPath, urlPathSet);

  // Canonical: elke pagina verwijst naar haar eigen, exacte URL (incl. .html
  // waar van toepassing) — dit gaat naar ELKE pagina, ook zonder EN-versie.
  const canonicalPath = urlPath;

  // hreflang-alternates enkel toevoegen als er echt een NL+EN-paar is
  // (x-default alleen telt niet als "echt" alternatief)
  const hasRealPair = allAlternates.some((a) => a.hreflang === "nl") &&
                       allAlternates.some((a) => a.hreflang === "en");
  const alternates = hasRealPair ? allAlternates : [];
  if (hasRealPair) withHreflang++;

  const original = fs.readFileSync(fullPath, "utf8");
  const block = buildBlock(canonicalPath, alternates);
  const updatedHtml = upsertBlock(original, block);

  if (updatedHtml === null) {
    skippedNoHead++;
    console.warn(`Geen <head> gevonden, overgeslagen: ${fullPath}`);
    return;
  }

  if (updatedHtml !== original) {
    fs.writeFileSync(fullPath, updatedHtml, "utf8");
    updated++;
  }
});

console.log(`Klaar. ${updated} bestand(en) bijgewerkt (allemaal met canonical, ${withHreflang} daarvan ook met hreflang), ${skippedNoHead} overgeslagen (geen <head> gevonden).`);
