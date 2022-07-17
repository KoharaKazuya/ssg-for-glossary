/** @see /docs/entry.md */
export interface Entry {
  path: string;
  frontMatter: unknown;
  markdown: string;
}

/** @see /docs/page.md */
export interface Page {
  path: string;
  html: string;
}

/** @see /docs/asset.md */
export interface Asset {
  path: string;
  content: string;
}

/** @see /docs/resource.md */
export type Resource = Page | Asset;
