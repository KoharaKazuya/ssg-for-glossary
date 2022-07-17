import fs from "fs-extra";
import globAsync from "glob";
import path from "path";
import { promisify } from "util";
import type { Resource } from "./types";

const glob = promisify(globAsync);

export async function copy(
  /** 用語の Markdown ファイルのルートディレクトリ */
  input: string,
  /** 出力する HTML ファイルのルートディレクトリ */
  output: string
): Promise<void> {
  await fs.rm(output, { recursive: true, force: true });
  await fs.copy(input, output);
}

/**
 * @returns 全用語 Markdown ファイルのパスリスト
 */
export async function scan(
  /** 用語の Markdown ファイルのルートディレクトリ */
  root: string
): Promise<string[]> {
  const files = await glob("**/*.md", { cwd: root });
  return files;
}

export async function put(
  /** 出力する HTML ファイルのルートディレクトリ */
  root: string,
  /** 全画面リスト */
  resources: Resource[]
): Promise<void> {
  await Promise.all(
    resources.map(async (resource) => {
      const isPage = "html" in resource;
      const p = path.join(root, `${resource.path}${isPage ? ".html" : ""}`);
      const dir = path.dirname(p);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(p, isPage ? resource.html : resource.content);
    })
  );
}
