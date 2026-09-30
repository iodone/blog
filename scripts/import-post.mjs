#!/usr/bin/env node
/**
 * Import a Markdown doc from the workspace into the blog content collection.
 *
 * The workspace docs under `contexts/**` are written for the agent: they start
 * with an H1, carry no frontmatter, and use `##`/`###` for structure. A blog
 * entry needs frontmatter and must not repeat its title as an H1 (Nimbus
 * renders the title from frontmatter). This script bridges the two without
 * rewriting the body — the source text stays verbatim.
 *
 *   pnpm import:post <source.md> [--tags a,b] [--date YYYY-MM-DD]
 *                                [--slug x] [--title "..."] [--force]
 *
 * `--date` defaults to a `YYYY-MM-DD` found in the source filename.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const SITE_ROOT = resolve(import.meta.dirname, "..");
const CONTENT_DIR = join(SITE_ROOT, "src/content/blog");

// ---------- args ----------

const argv = process.argv.slice(2);
const positional = [];
const args = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  } else {
    positional.push(a);
  }
}

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

if (positional.length !== 1) {
  fail("usage: pnpm import:post <source.md> [--tags a,b] [--date YYYY-MM-DD] [--slug x] [--title \"...\"] [--force]");
}

const srcPath = resolve(positional[0]);
if (!existsSync(srcPath)) fail(`source not found: ${srcPath}`);
if (!/\.mdx?$/.test(srcPath)) fail(`source must be .md or .mdx: ${srcPath}`);

// ---------- read + split frontmatter ----------

const raw = readFileSync(srcPath, "utf8");
let body = raw;
let sourceFrontmatter = {};
const fm = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
if (fm) {
  body = raw.slice(fm[0].length);
  for (const line of fm[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) sourceFrontmatter[kv[1]] = kv[2].trim().replace(/^["\x27]|["\x27]$/g, "");
  }
}

// ---------- title: first H1 of the body ----------

const lines = body.split(/\r?\n/);
let title = typeof args.title === "string" ? args.title.trim() : "";
let h1Index = -1;
if (!title) {
  h1Index = lines.findIndex((l) => /^#\s+\S/.test(l));
  if (h1Index === -1) fail("no H1 found in source — pass --title");
  title = lines[h1Index].replace(/^#\s+/, "").trim();
}

// The title now lives in frontmatter; drop the duplicate H1 and any blank
// lines that preceded it.
const outLines = h1Index === -1 ? [...lines] : lines.filter((_, i) => i !== h1Index);
while (outLines.length && outLines[0].trim() === "") outLines.shift();

// Demote any remaining top-level H1 (`# x` outside code fences) to H2 so the
// page keeps exactly one H1 — the rendered title.
let fence = false;
let fenceChar = "";
let demoted = 0;
for (let i = 0; i < outLines.length; i++) {
  const m = outLines[i].match(/^\s*(`{3,}|~{3,})/);
  if (m) {
    if (!fence) {
      fence = true;
      fenceChar = m[1][0];
    } else if (m[1][0] === fenceChar) {
      fence = false;
    }
    continue;
  }
  if (fence) continue;
  if (/^#\s+\S/.test(outLines[i])) {
    outLines[i] = `#${outLines[i]}`;
    demoted++;
  }
}

// ---------- date ----------

const fileStem = basename(srcPath, extname(srcPath));
const fromName =
  fileStem.match(/(\d{4})-(\d{2})-(\d{2})/) ?? fileStem.match(/(\d{4})(\d{2})(\d{2})/);
let date =
  typeof args.date === "string"
    ? args.date
    : fromName
      ? [fromName[1], fromName[2], fromName[3]].join("-")
      : "";
if (!date) {
  const t = new Date();
  const p = (n) => String(n).padStart(2, "0");
  date = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`invalid --date "${date}" — expected YYYY-MM-DD`);

// ---------- slug ----------

function slugify(input) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u3000\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const slug = typeof args.slug === "string"
  ? args.slug.trim()
  : slugify(fileStem.replace(/^\d{4}-\d{2}-\d{2}-?/, ""));
if (!slug) fail("could not derive a slug from the filename — pass --slug");
if (/[\/:*?"<>|]/.test(slug)) fail(`slug contains unsafe filename characters: "${slug}"`);

// ---------- tags ----------

const tagSource = typeof args.tags === "string"
  ? args.tags
  : (sourceFrontmatter.tags ?? "").replace(/^\[|\]$/g, "");
const tags = tagSource.split(",").map((t) => t.trim()).filter(Boolean);

// ---------- description ----------

let description = typeof args.description === "string" ? args.description : "";
if (!description) {
  if (sourceFrontmatter.description) {
    description = sourceFrontmatter.description;
  } else {
    const isProse = (l) => {
      const t = l.trim();
      if (!t) return false;
      if (/^[>|#*+]/ .test(t)) return false; // heading, quote, table, bullet
      if (t.startsWith("-")) return false;
      if (/^\d+[.)]\s/.test(t)) return false; // ordered-list item
      if (/^\*\*[^*]+\*\*\s*[:：]/.test(t)) return false; // "**日期**: ..." metadata
      return t.length >= 12;
    };
    const para = outLines.slice(0, 60).find(isProse);
    if (para) description = para.replace(/[`*_[\]]/g, "").replace(/\s+/g, " ").slice(0, 120).trim();
  }
}

// ---------- write ----------

const filePath = join(CONTENT_DIR, `${slug}.md`);
if (existsSync(filePath) && !args.force) {
  fail(`${relative(SITE_ROOT, filePath)} already exists — pass --force to overwrite it`);
}

const frontmatter = [
  "---",
  `title: ${JSON.stringify(title)}`,
  `description: ${JSON.stringify(description)}`,
  `date: ${date}`,
  tags.length ? `tags:\n${tags.map((t) => `  - ${JSON.stringify(t)}`).join("\n")}` : "tags: []",
  "---",
  "",
].join("\n");

mkdirSync(CONTENT_DIR, { recursive: true });
writeFileSync(filePath, `${frontmatter}\n${outLines.join("\n").replace(/^\n+/, "")}\n`, "utf8");

// ---------- report ----------

console.log(`imported: ${relative(SITE_ROOT, srcPath)}`);
console.log(`     as:  ${relative(SITE_ROOT, filePath)}`);
console.log(`   slug:  ${slug}   ->  /blog/${slug}`);
console.log(`   date:  ${date}`);
console.log(`  title:  ${title}`);
console.log(`   tags:  ${tags.length ? tags.join(", ") : "(none)"}`);
console.log(`  desc:  ${description}`);
if (demoted) console.log(`  note:  demoted ${demoted} extra H1 heading(s) to H2`);
