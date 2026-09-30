import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import nimbus, {
  defineConfig as defineNimbusConfig,
} from "@cloudflare/nimbus-docs";
import { tableScroll } from "@cloudflare/nimbus-docs/markdown";

const nimbusConfig = defineNimbusConfig({
  // Canonical origin, no trailing slash. Drives canonical URLs, absolute OG
  // image URLs, robots.txt, sitemap, and the links in /llms.txt.
  //
  // Deployed as a Cloudflare Worker with a Custom Domain: one Worker per
  // subdomain of meta42.me (see the deploy section in README). The blog owns
  // its own origin, so no base is needed - moving subdomains means changing
  // this one string. Moving to a path prefix instead (meta42.me/blog) would
  // need a base plus a re-check of every internal link: withBase() covers
  // that, but it is a migration, not a config toggle.
  site: "https://blog.meta42.me",
  // CHANGE_ME: your project's name — used for <title>, the home H1, and OG.
  title: "Meta42",
  // CHANGE_ME: a one-line description of your docs — used for meta + OG.
  description: "调研 · 深度思考 · 认知",
  locale: "zh-CN",
  github: null,
  socialImageAlt: "Meta42 · 调研 · 深度思考 · 认知",
  sidebar: {
    // Keep the default docs tree (same shape the filesystem autogenerate
    // builds), then make the blog feed reachable from the docs chrome.
    items: [
      { autogenerate: { collection: "docs" } },
      { label: "Blog", link: "/blog" },
    ],
  },
});

export default defineConfig({
  // nimbus:adapter
  output: "static",
  // Tailwind v4 via its Vite plugin (the integration Astro recommends for
  // Tailwind v4 — replaces the PostCSS plugin, which doesn't build under
  // Astro 7's Vite 8 bundler).
  vite: {
    plugins: [tailwindcss()],
  },
  // Hover-prefetch link targets so full-page navigations feel instant without
  // a client-side router.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    nimbus(nimbusConfig, {
      // Authoring rules are opt-in by design — your repo, your taste. The
      // two below are the load-bearing pair: frontmatter has to validate
      // against the content schema for the page to render properly, and
      // broken internal links are 404s for your readers. Add the others
      // (heading hierarchy, code-block language, style, etc.) when you're
      // ready to enforce them — see `nimbus-docs lint --help`.
      rules: {
        "nimbus/frontmatter-shape": "error",
        "nimbus/internal-link": "error",
      },
      // Wrap wide tables so they scroll instead of overflowing the page
      // (styled by `.nb-table-scroll` in src/styles/prose.css).
      markdown: {
        hastPlugins: [tableScroll()],
      },
    }),
  ],
});
