import { stripBase } from "@cloudflare/nimbus-docs/runtime";
import type { SidebarSection } from "@cloudflare/nimbus-docs/runtime";

/**
 * The publishing side of the site — everything that is not the docs tree.
 *
 * One array, one source of truth: the header strip renders from it and the
 * "is this section active" rule is derived from it, so adding a destination
 * is a one-line change here and nothing else moves.
 *
 * Expected growth (per Meta42): product pages and slide decks. Both are flat
 * additions below; /products/* and /slides/* only need a page each, and the
 * active-state rule already handles anything nested underneath them.
 */
export interface NavItem {
  /** Rendered label in the header strip. */
  label: string;
  /** Site-absolute path, without the deploy base prefix. */
  href: string;
}

export const NAV: readonly NavItem[] = [
  { label: "文章", href: "/blog" },
  { label: "标签", href: "/tags" },
  { label: "归档", href: "/archive" },
  { label: "关于", href: "/about" },
];

/**
 * Build the header tab strip for `pathname`. An item is active on its own
 * page and anywhere beneath it, so /blog/some-post keeps 文章 lit and
 * /tags/数据库 keeps 标签 lit.
 */
export function navSections(pathname: string, base = "/"): SidebarSection[] {
  const path = stripBase(pathname, base).replace(/\/$/, "") || "/";
  return NAV.map((item) => ({
    label: item.label,
    href: item.href,
    isActive: path === item.href || path.startsWith(`${item.href}/`),
  }));
}
