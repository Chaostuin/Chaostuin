#!/usr/bin/env node
/**
 * generate-sitemap.js
 *
 * Scant de repo op .html-pagina's en genereert sitemap.xml.
 * Sluit technische/interne bestanden uit (components, 404, etc.)
 * en koppelt NL/EN-versies van dezelfde pagina via hreflang.
 *
 * Gebruik:
 *   node generate-sitemap.js
 *
 * Instellingen hieronder aanpassen indien nodig (SITE_URL, EXCLUDE_*).
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ---- Instellingen -----------------------------------------------------

const SITE_URL = "https://chaostuin.be";
const ROOT_DIR = process.cwd(); // script uitvoeren vanuit de repo-root

// Mappen die volledig overgeslagen worden
const EXCLUDE_DIRS = new Set([
  "components",   // nav.html, footer.html, footer-en.html, nav-en.html, etc. — geen pagina's
  ".git",
  "node_modules",
]);

// Specifieke bestandsnamen die overgeslagen worden, ongeacht map
const EXCLUDE_FILENAMES = new Set([
  "404.html",
]);

// Bestanden die je liever WEL laat scannen maar met lagere prioriteit
// (grensgevallen zoals detail-subpagina's van een tool)
const LOW_PRIORITY_PATTERNS = [/_detail\.html$/i];

// ---- Helpers ------------------------------------------------------------

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // .well-known, .github, etc.
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
  // Absoluut pad -> URL-pad relatief aan site-root, met voorwaartse slashes
  let rel = path.relative(ROOT_DIR, fullPath).split(path.sep).join("/");
  // index.html -> map-root (bv. "en/index.html" -> "en/", "index.html" -> "")
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"index.html".length);
  return "/" + rel;
}

function lastModFor(fullPath) {
  // Probeer laatste git-commit-datum te gebruiken; val terug op bestand-mtime
  try {
    const out = execSync(`git log -1 --format=%cI -- "${fullPath}"`, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (out) return out.slice(0, 10); // YYYY-MM-DD
  } catch (e) {
    // geen git beschikbaar of geen historiek — geen probleem
  }
  const stat = fs.statSync(fullPath);
  return stat.mtime.toISOString().slice(0, 10);
}

function priorityFor(urlPath, fullPath) {
  if (urlPath === "/") return "1.0";
  if (LOW_PRIORITY_PATTERNS.some((re) => re.test(fullPath))) return "0.4";
  if (urlPath.startsWith("/en/")) return "0.6"; // pas aan indien EN-versie gelijkwaardig moet wegen
  return "0.8";
}

// Koppelt NL-pad aan EN-pad (en omgekeerd) voor hreflang, ervan uitgaande
// dat de structuur onder /en/ de NL-structuur spiegelt (bv. /aanpak/bodem.html
// <-> /en/aanpak/bodem.html).
function alternateFor(urlPath, allUrlPaths) {
  let nlPath, enPath;
  if (urlPath.startsWith("/en/")) {
    enPath = urlPath;
    nlPath = urlPath.slice(3); // strip "/en"
    if (nlPath === "") nlPath = "/";
  } else {
    nlPath = urlPath;
    enPath = urlPath === "/" ? "/en/" : "/en" + urlPath;
  }
  const alternates = [];
  if (allUrlPaths.has(nlPath)) alternates.push({ hreflang: "nl", href: nlPath });
  if (allUrlPaths.has(enPath)) alternates.push({ hreflang: "en", href: enPath });
  return alternates;
}

// ---- Hoofdlogica ---------------------------------------------------------

const files = walk(ROOT_DIR);
const urlPaths = files.map(toUrlPath);
const urlPathSet = new Set(urlPaths);

const entries = files.map((fullPath, i) => {
  const urlPath = urlPaths[i];
  return {
    urlPath,
    fullPath,
    lastmod: lastModFor(fullPath),
    priority: priorityFor(urlPath, fullPath),
    alternates: alternateFor(urlPath, urlPathSet),
  };
});

// Sorteer voor leesbare/consistente output
entries.sort((a, b) => a.urlPath.localeCompare(b.urlPath));

const xmlLines = [];
xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
xmlLines.push(
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
);

for (const entry of entries) {
  xmlLines.push("  <url>");
  xmlLines.push(`    <loc>${SITE_URL}${entry.urlPath}</loc>`);
  xmlLines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  xmlLines.push(`    <priority>${entry.priority}</priority>`);
  for (const alt of entry.alternates) {
    xmlLines.push(
      `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${SITE_URL}${alt.href}" />`
    );
  }
  xmlLines.push("  </url>");
}

xmlLines.push("</urlset>");
xmlLines.push(""); // trailing newline

const outPath = path.join(ROOT_DIR, "sitemap.xml");
fs.writeFileSync(outPath, xmlLines.join("\n"), "utf8");

console.log(`sitemap.xml geschreven met ${entries.length} pagina's -> ${outPath}`);
