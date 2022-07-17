import { escape } from "html-escaper";
import { findAndReplace } from "mdast-util-find-and-replace";
import { toString } from "mdast-util-to-string";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Processor, Transformer } from "unified";
import { unified } from "unified";
import { u } from "unist-builder";
import type { Asset, Entry, Page, Resource } from "./types";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(termLinker)
  .use(remarkRehype)
  .use(rehypeStringify)
  .freeze();

const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>{title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@exampledev/new.css@1.1.2/new.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/quicklink/2.2.0/quicklink.umd.js"></script>
    <script>window.addEventListener('load', () => { quicklink.listen(); });</script>
    <script type="module" src="/search.js"></script>
  </head>
  <body>
    <header>
      <h1><a href="/">用語集</a></h1>
      <nav>
        <label for="search">キーワード検索: </label><input type="search" name="keyword" id="search">
        <ul id="result"></ul>
      </nav>
    </header>
    <h1>{title}</h1>
    {content}
  </body>
</html>
`;

const searchJs = `
  import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js";
  import { escape } from "https://cdn.jsdelivr.net/npm/html-escaper@3.0.3/esm/index.js";

  const fusePromise = (async () => {
    const response = await fetch("/index.json");
    if (!response.ok) throw new Error("fetch failed");
    const indexJson = await response.json();
    return new Fuse(indexJson, {
      keys: ["path", "frontMatter.kana", "frontMatter.alias", "frontMatter.tag", "markdown"],
    });
  })();

  const input = document.querySelector("#search");
  const result = document.querySelector("#result");

  window.addEventListener("keydown", (event) => {
    if (input.contains(event.target)) return;

    if ((event.ctrlKey || event.metaKey) && event.key === "f") {
      event.preventDefault();
      event.stopPropagation();

      input.focus();
    }
  });

  input.addEventListener("input", (event) => {
    const keyword = input.value;

    (async () => {
      const fuse = await fusePromise;
      const items = fuse.search(keyword);

      result.innerHTML = items.map(({ item: entry }) => \`<li><a href="/\${
        encodeURI(entry.path)
      }">\${escape(entry.path)}</a></li>\`).join("");
    })().catch((e) => console.error(e));
  });
`;

/**
 * @returns 全画面リスト
 */
export async function render(
  /** 全エントリリスト */
  entries: Entry[]
): Promise<Resource[]> {
  return await Promise.all([
    renderIndex(entries),
    renderTagIndex(entries),
    ...renderTags(entries),
    ...renderEntries(entries),
    renderPageNotFound(),
    renderSearchJs(),
    renderIndexJson(entries),
  ]);
}

async function renderIndex(entries: Entry[]): Promise<Page> {
  const html = generateHtml({
    title: "用語集",
    content: getDictionaryHtml(entries),
  });
  return { path: "/index", html };
}

async function renderTagIndex(entries: Entry[]): Promise<Page> {
  const tags = getTags(entries);
  // sort alphabetically
  tags.sort((a, b) => (a[0] > b[0] ? 1 : -1));

  const html = generateHtml({
    title: "タグ",
    content: `<ul>${tags
      .map(
        ([tag]) =>
          `<li><a href="/tags/${encodeURI(tag)}">${escape(tag)}</a></li>`
      )
      .join("")}</ul>`,
  });
  return { path: "/tags/index", html };
}

function renderTags(entries: Entry[]): Promise<Page>[] {
  const tags = getTags(entries);
  // sort alphabetically
  tags.sort((a, b) => (a[0] > b[0] ? 1 : -1));

  return tags.map(async ([tag, entries]) => {
    const html = generateHtml({
      title: `<small>[タグ]</small> ${escape(tag)}`,
      content: getDictionaryHtml(entries),
    });
    return { path: `/tags/${tag}`, html };
  });
}

function renderEntries(entries: Entry[]): Promise<Page>[] {
  return entries.map(async (entry) => {
    const aliasRaw = (entry.frontMatter as any).alias as unknown;
    const aliases = aliasRaw
      ? (Array.isArray(aliasRaw) ? aliasRaw : [aliasRaw]).map((x) => String(x))
      : [];

    const tagRaw = (entry.frontMatter as any).tag as unknown;
    const tags = tagRaw
      ? (Array.isArray(tagRaw) ? tagRaw : [tagRaw]).map((x) => String(x))
      : [];

    const kana = String((entry.frontMatter as any).kana ?? "");

    const safePath = escape(entry.path);
    const title = kana
      ? `<ruby>${safePath}<rp> (</rp><rt>${escape(kana)}</rt><rp>)</rp></ruby>`
      : safePath;

    const vfile = await processor().data({ entries }).process(entry.markdown);
    const html = generateHtml({
      title,
      content: `${
        aliases.length > 0
          ? `<div>別名: ${aliases
              .map((x) => `<dfn>${escape(x)}</dfn>`)
              .join(", ")}</div>`
          : ""
      }${
        tags.length > 0
          ? `<div>タグ: ${tags
              .map(
                (tag) => `<a href="/tags/${encodeURI(tag)}">${escape(tag)}</a>`
              )
              .join(", ")}</div>`
          : ""
      }${vfile}`,
    });
    return { path: entry.path, html };
  });
}

async function renderPageNotFound(): Promise<Page> {
  const html = generateHtml({
    title: "ページがありません",
    content:
      '<p>ご指定のページは見つかりませんでした。</p><p><a href="/">トップに戻る</a>',
  });
  return { path: "/404", html };
}

async function renderSearchJs(): Promise<Asset> {
  return { path: "/search.js", content: searchJs };
}

async function renderIndexJson(entries: Entry[]): Promise<Asset> {
  return { path: "/index.json", content: JSON.stringify(entries) };
}

function termLinker(this: Processor): Transformer {
  const entries = (this.data("entries") ?? []) as Entry[];
  const links = getLinks(entries);
  // sort by length of term
  links.sort((a, b) => b[0].length - a[0].length);

  return (node) => {
    for (const link of links) {
      const [term, entry] = link;
      findAndReplace(
        node as any,
        term,
        () =>
          u("link", { url: `/${encodeURI(entry.path)}` }, [u("text", term)]),
        { ignore: ["link", "linkReference"] }
      );
    }
  };
}

function getLinks(entries: Entry[]): [string, Entry][] {
  const links: [string, Entry][] = [];
  for (const entry of entries) {
    links.push([entry.path, entry]);
    for (const alias of getAliases(entry)) {
      links.push([alias, entry]);
    }
  }
  return links;
}

function getTags(entries: Entry[]): [string, Entry[]][] {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const raw = (entry.frontMatter as any).tag as unknown;
    const tags = raw
      ? (Array.isArray(raw) ? raw : [raw]).map((x) => String(x))
      : [];
    for (const tag of tags) {
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(entry);
    }
  }
  return Array.from(map.entries());
}

function getAliases(entry: Entry): string[] {
  const metadata = entry.frontMatter;
  if (typeof metadata !== "object" || metadata === null) return [];

  const alias = (metadata as any).alias;
  const aliases = Array.isArray(alias)
    ? alias.filter((x) => x).map((x) => String(x))
    : typeof alias === "string"
    ? [alias]
    : [];

  return aliases;
}

function getDictionaryHtml(entries: Entry[]): string {
  const links = getLinks(entries);
  // sort alphabetically
  links.sort((a, b) => (a[0] > b[0] ? 1 : -1));

  const defs = links.map(
    ([term, entry]) =>
      `<dt><a href="/${encodeURI(entry.path)}">${escape(term)}</a></dt><dd>${
        term === entry.path
          ? toString(unified().use(remarkParse).parse(entry.markdown))
          : entry.path
      }</dd>`
  );

  return `<dl>${defs.join("")}</dl>`;
}

function generateHtml(data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (accu, [key, value]) =>
      // replaceAll
      accu.split(`{${key}}`).join(value),
    htmlTemplate
  );
}
