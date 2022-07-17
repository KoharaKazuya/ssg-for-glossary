#!/usr/bin/env node

import { program } from "commander";
import process from "process";
import { generate } from "./dist/ssg-for-glossary.js";

program
  .option(
    "-o, --output <output_dir>",
    "出力する HTML ファイルのルートディレクトリ",
    "out"
  )
  .argument("<input_dir>", "用語の Markdown ファイルのルートディレクトリ");
program.parse();

async function main() {
  const args = program.args;
  const options = program.opts();
  await generate({ inputDir: args[0], outputDir: options.output });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
