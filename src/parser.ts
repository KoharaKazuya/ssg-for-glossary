import fs from "fs/promises";
import matter from "gray-matter";
import path from "path";
import type { Entry } from "./types";

/**
 * @returns 全エントリリスト
 */
export async function read(
  /** 用語の Markdown ファイルのルートディレクトリ */
  root: string,
  /** 全用語の Markdown ファイルのパスリスト */
  filePaths: string[]
): Promise<Entry[]> {
  return await Promise.all(filePaths.map((path) => readFile(root, path)));
}

async function readFile(root: string, p: string) {
  const content = await fs.readFile(path.join(root, p), { encoding: "utf-8" });
  const { data: frontMatter, content: markdown } = matter(content);
  return { path: p.replace(/(?<=.)\..*$/, ""), frontMatter, markdown };
}
