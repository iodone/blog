#!/usr/bin/env node
/**
 * new-post.mjs — create a blog post stub at src/content/blog/<slug>.mdx.
 *
 * Usage:
 *   node scripts/new-post.mjs --title "开始写博客" [--description "一句话摘要"]
 *     [--date 2026-09-29] [--tags "meta,note"] [--slug my-slug] [--force]
 *
 * Zero dependencies — node:fs + node:path only. Requires Node >= 22.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SITE_ROOT = resolve(import.meta.dirname, "..");
const CONTENT_DIR = join(SITE_ROOT, "src", "content", "blog");

function fail(message) {
  console.error(`new-post: ${message}`);
  process.exit(1);
}

// ---------- args ----------

function parseArgs(argv) {
  const out = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) fail(`unexpected argument: ${arg}`);
    const eq = arg.indexOf("=");
    let key;
    let value;
    if (eq !== -1) {
      key = arg.slice(2, eq);
      value = arg.slice(eq + 1);
    } else {
      key = arg.slice(2);
      if (key === "force") {
        out.force = true;
        continue;
      }
      value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        fail(`--${key} needs a value`);
      }
    }
    if (key === "force") {
      out.force = true;
      continue;
    }
    if (!["title", "description", "date", "tags", "slug"].includes(key)) {
      fail(`unknown flag: --${key}`);
    }
    out[key] = value;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.title || !args.title.trim()) fail("--title is required");

// ---------- date (default: today, Asia/Shanghai) ----------

// en-CA formats as YYYY-MM-DD; pinning timeZone keeps "today" stable no
// matter where the script runs.
const todayShanghai = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const date = args.date ?? todayShanghai;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail(`--date must be YYYY-MM-DD (got "${date}")`);
}
if (Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
  fail(`--date is not a valid date (got "${date}")`);
}

// ---------- slug ----------

// Unsafe filename characters — stripped wherever they appear.
const UNSAFE = /[\\/:*?"<>|]/g;

// Keep CJK characters; only whitespace and unsafe filename characters are
// replaced or stripped. ASCII is lowercased so URLs stay canonical.
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(UNSAFE, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const slug = args.slug ? args.slug.trim() : slugify(args.title);
if (!slug) fail(`could not derive a slug from title "${args.title}" — pass --slug`);
if (/[\\/:*?"<>|]/.test(slug)) {
  fail(`slug contains unsafe filename characters: "${slug}"`);
}

// ---------- tags ----------

const tags = (args.tags ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

// ---------- write ----------

const filePath = join(CONTENT_DIR, `${slug}.mdx`);
if (existsSync(filePath) && !args.force) {
  fail(
    `${relative(SITE_ROOT, filePath)} already exists — pass --force to overwrite it`,
  );
}

const frontmatter = [
  "---",
  `title: ${JSON.stringify(args.title.trim())}`,
  `description: ${JSON.stringify((args.description ?? "").trim())}`,
  `date: ${date}`,
  tags.length
    ? `tags:\n${tags.map((t) => `  - ${JSON.stringify(t)}`).join("\n")}`
    : "tags: []",
  "---",
  "",
].join("\n");

mkdirSync(CONTENT_DIR, { recursive: true });
writeFileSync(filePath, `${frontmatter}\n`, "utf8");

console.log(`created: ${relative(SITE_ROOT, filePath)}`);
console.log(`url:     /blog/${slug}`);
