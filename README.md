# SSG for Glossary

用語集のための SSG (Static Site Generator)。

用語 1 つにつき 1 つの Markdown ファイルが収められたディレクトリを読み取り、用語集として使える Web サイトを生成するためのライブラリおよびコマンドを提供します。

## フォーマット

1 つの用語の説明を 1 つの Markdown ファイルに記載してください。すべての Markdown ファイルは特定ディレクトリ以下に配置します。

Markdown ファイルのファイル名は `<用語>.md` とします。たとえば、`用語集` のためのファイルは `用語集.md` です。

Markdown ファイルの中身は任意の GFM ([GitHub Flavored Markdown](https://github.github.com/gfm/)) が使用できます。ただし、後述する用語の自動リンクと Front Matter について特別なルールがあります。

Markdown ファイル中に出現する用語は Markdown ファイルとして定義されていると自動的にハイパーリンクになります。たとえば、`整理された用語集を使うと**理解の助け**となります。` のような Markdown の場合、ファイルとして `用語集.md` が定義されていれば `整理された<a href="/用語集">用語集</a>を使うと<b>理解の助け</b>となります。` のような出力となります。

Markdown ファイルの先頭に用語のメタデータとなる [Front Matter](https://middlemanapp.com/jp/basics/frontmatter/) を埋め込むことができます。YAML で記述します。定義済みのメタデータは

| キー  | 説明                                                                               |
| ----- | ---------------------------------------------------------------------------------- |
| kana  | 用語の読み方。                                                                     |
| alias | 用語の別名。リストで複数記載できる。ここに定義された単語でも自動リンクされる。     |
| tag   | 用語の分類。リストで複数記載できる。ここに記載された単語の専用ページが生成される。 |

**サンプル**

`取説.md`

```md
---
kana: とりせつ
alias: 説明書
tag:
  - 一般
  - 最初に見ておいてほしい
---

整理された用語集を使うと**理解の助け**となります。
```

## 使い方

### CLI

以下のコマンドを実行すると out ディレクトリに Web サイトが出力されます。

```console
$ npx ssg-for-glossary <用語の Markdown ファイルが格納されたディレクトリ>
```

### ライブラリ

```javascript
import { generate } from "ssg-for-glossary";

async function main() {
  await generate({
    inputDir: "<用語の Markdown ファイルが格納されたディレクトリ>",
  });
}
```

**カスタマイズ**

```javascript
import { copy, scan, read, render, put } from "ssg-for-glossary";

async function generate({ inputDir, outputDir }) {
  await copy(inputDir, outputDir);
  const filePaths = await scan(inputDir);
  const entries = await read(inputDir, filePaths);
  const pages = await render(entries);
  await put(outputDir, pages);
}
```
