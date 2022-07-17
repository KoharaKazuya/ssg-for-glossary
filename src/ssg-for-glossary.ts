import process from "process";
import { copy, put, scan } from "./fs";
import { read } from "./parser";
import { render } from "./renderer";

export async function generate({
  inputDir = process.cwd(),
  outputDir = "out",
}: {
  /** 用語の Markdown ファイルのルートディレクトリ */
  inputDir?: string;
  /** 出力する HTML ファイルのルートディレクトリ */
  outputDir?: string;
}) {
  await copy(inputDir, outputDir);
  const filePaths = await scan(inputDir);
  const entries = await read(inputDir, filePaths);
  const pages = await render(entries);
  await put(outputDir, pages);
}

export { copy, put, scan } from "./fs";
export { read } from "./parser";
export { render } from "./renderer";
