#!/usr/bin/env node
/**
 * add-hreflang.js
 *
 * Voegt <link rel="alternate" hreflang="..."> tags toe aan de <head> van
 * elke HTML-pagina die een NL/EN-tegenhanger heeft (zelfde koppel-logica
 * als generate-sitemap.js: /aanpak/bodem.html <-> /en/aanpak/bodem.html).
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

const MARKER_START = "<!-- hreflang:start -->";
const MARKER_END = "<!-- hreflang:end -->";

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

function buildBlock(alternates) {
  const lines = [MARKER_START];
  for (const alt of alternates) {
    lines.push(`  <link rel="alternate" hreflang="${alt.hreflang}" href="${SITE_URL}${alt.href}" />`);
  }
  lines.push(MARKER_END);
  return lines.join("\n");
}

function upsertBlock(html, block) {
  const markerRegex = new RegExp(
    `[ \\t]*${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`,
    "i"
  );
  if (markerRegex.test(html)) {
    // Bestaand blok vervangen
    return html.replace(markerRegex, block + "\n");
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
let skippedNoPair = 0;
let skippedNoHead = 0;

files.forEach((fullPath, i) => {
  const urlPath = urlPaths[i];
  const alternates = alternatesFor(urlPath, urlPathSet);

  // Enkel zinvol als er minstens een NL+EN-paar is (dus 2+ alternates,
  // want x-default telt niet als "echt" alternatief op zich)
  const hasRealPair = alternates.some((a) => a.hreflang === "nl") &&
                       alternates.some((a) => a.hreflang === "en");
  if (!hasRealPair) {
    skippedNoPair++;
    return;
  }

  const original = fs.readFileSync(fullPath, "utf8");
  const block = buildBlock(alternates);
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

console.log(`Klaar. ${updated} bestand(en) bijgewerkt, ${skippedNoPair} overgeslagen (nog geen NL+EN-paar), ${skippedNoHead} overgeslagen (geen <head> gevonden).`);
