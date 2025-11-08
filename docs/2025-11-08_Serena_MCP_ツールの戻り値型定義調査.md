# Serena MCPツールの戻り値型定義調査

**作成日**: 2025-11-08

## 目的

Serena MCPツールが返すJSON文字列をパースした後のオブジェクト構造（型定義）を特定する。

## 前提条件

- TOOLS.mdやservers/serena/配下のファイルには型定義情報が含まれていない可能性がある
- 各ツールの戻り値は文字列型だが、中身はJSON形式
- TypeScriptで型安全にSerenaツールを使用するために型定義が必要

## 背景

現在、`.claude/skills/mcp-code-execution/src/analyze-parser-data-flow.ts`スクリプトで以下の問題が発生している:

```typescript
// 問題のあるコード
const result = await listDir({ relative_path: 'packages/parser/src', recursive: true });
// ↑ resultはstring型（JSON文字列）
const tsFiles = result.files.filter(...);
// ↑ エラー: 'result'は 'unknown' 型です
```

### 原因

1. Serena MCPツールの戻り値は**すべて文字列型**
2. その文字列の中身は**JSON形式**
3. `JSON.parse()`で変換後のオブジェクト構造が不明

## 必要な情報

以下の各ツールについて、**戻り値のJSON構造**を特定する必要があります:

### 1. `listDir`

**用途**: ディレクトリ内のファイル・ディレクトリ一覧を取得

**期待される構造**:
```typescript
type ListDirResult = {
  dirs: string[];   // ディレクトリ一覧
  files: string[];  // ファイル一覧
  // その他のプロパティ...?
};
```

**確認が必要な項目**:
- `dirs`プロパティは存在するか？
- `files`プロパティは存在するか？
- 他に含まれるプロパティはあるか？

### 2. `getSymbolsOverview`

**用途**: ファイル内のシンボル（関数・型・クラスなど）の一覧を取得

**期待される構造**:
```typescript
type SymbolInfo = {
  name_path: string;  // シンボル名
  kind: number;       // シンボルの種類（11=関数, 12=メソッド, 1=変数, 2=型など）
  // その他のプロパティ...?
};

type GetSymbolsOverviewResult = SymbolInfo[];
```

**確認が必要な項目**:
- `name_path`プロパティは存在するか？（または`name`？）
- `kind`プロパティの型は何か？（number? string?）
- `kind`の値と意味の対応表
- 他に含まれるプロパティはあるか？（`range`, `location`など）

### 3. `findSymbol`

**用途**: 特定のシンボルを検索して詳細情報を取得

**期待される構造**:
```typescript
type FindSymbolResultItem = {
  relative_path: string;  // ファイルパス
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  // その他のプロパティ...?
};

type FindSymbolResult = FindSymbolResultItem[];
```

**確認が必要な項目**:
- `relative_path`プロパティは存在するか？
- `range`の構造
- 他に含まれるプロパティはあるか？

### 4. `searchForPattern`

**用途**: 正規表現パターンでコードを検索

**期待される構造**:
```typescript
type SearchForPatternResult = Array<{
  // 構造が完全に不明
  file?: string;
  line?: number;
  content?: string;
  // ...?
}>;
```

**確認が必要な項目**:
- 配列か、オブジェクトか？
- どのようなプロパティを含むか？

## 調査方法

### 方法1: 実際にツールを実行して戻り値を確認（推奨）

最も確実な方法です。

```typescript
import { listDir, getSymbolsOverview, findSymbol, searchForPattern } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function investigateToolReturnTypes() {
  try {
    // 1. listDir
    console.log('=== listDir ===');
    const listDirResult = await listDir({ relative_path: 'packages/parser/src' });
    console.log('Raw:', listDirResult);
    console.log('Type:', typeof listDirResult);
    console.log('Parsed:', JSON.parse(listDirResult));

    // 2. getSymbolsOverview
    console.log('\n=== getSymbolsOverview ===');
    const symbolsResult = await getSymbolsOverview({ relative_path: 'packages/parser/src/index.ts' });
    console.log('Raw:', symbolsResult);
    console.log('Parsed:', JSON.parse(symbolsResult));

    // 3. findSymbol
    console.log('\n=== findSymbol ===');
    const findResult = await findSymbol({
      name_path: 'main',
      search_paths: ['packages/parser/src']
    });
    console.log('Raw:', findResult);
    console.log('Parsed:', JSON.parse(findResult));

    // 4. searchForPattern
    console.log('\n=== searchForPattern ===');
    const searchResult = await searchForPattern({
      pattern: 'export',
      paths: ['packages/parser/src'],
      file_pattern: '*.ts'
    });
    console.log('Raw:', searchResult);
    console.log('Parsed (first 3 items):', JSON.parse(searchResult).slice(0, 3));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeClient();
  }
}

investigateToolReturnTypes();
```

### 方法2: Serenaのドキュメント・ソースコードを確認

- Serena MCP serverの公式ドキュメント
- GitHubリポジトリ: https://github.com/ModelEarth/serena (推測)
- 型定義ファイル（`.d.ts`）の確認

### 方法3: MCPプロトコルの仕様を確認

MCPサーバーは通常、ツールの入出力スキーマを提供します。

```typescript
// MCPクライアントからツール定義を取得
// tools[0].outputSchema などに型情報が含まれている可能性
```

### 方法4: 実行時のログから推測

`.claude/skills/mcp-code-execution/src/analyze-parser-data-flow.ts`を実行した際のログ:

```
INFO serena.tools.tools_base:task:278 - Result: {"dirs": ["packages/parser/src/types", "packages/parser/src/utils"], "files": ["packages/parser/src/types/index.ts", ...]}
```

ここから`listDir`の戻り値構造が推測できます。

## 成果物

調査完了後、以下の型定義ファイルを作成してください:

**ファイル名**: `.claude/skills/mcp-code-execution/types/serena-tools.d.ts`

```typescript
/**
 * Serena MCPツールの戻り値型定義
 */

export type ListDirResult = {
  dirs: string[];
  files: string[];
};

export type SymbolInfo = {
  name_path: string;
  kind: number;
  // 調査結果に基づいて追加
};

export type GetSymbolsOverviewResult = SymbolInfo[];

export type FindSymbolResultItem = {
  relative_path: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  // 調査結果に基づいて追加
};

export type FindSymbolResult = FindSymbolResultItem[];

export type SearchForPatternResultItem = {
  // 調査結果に基づいて定義
};

export type SearchForPatternResult = SearchForPatternResultItem[];
```

## 型定義適用後のコード例

```typescript
import { listDir, getSymbolsOverview, findSymbol, searchForPattern } from '../servers/serena/index.js';
import { closeClient } from './client.js';
import type {
  ListDirResult,
  GetSymbolsOverviewResult,
  FindSymbolResult,
  SearchForPatternResult
} from '../types/serena-tools.js';

async function main() {
  // 型安全に使用可能
  const listDirStr = 
  await listDir({ relative_path: 'src', recursive: true });
  const result = JSON.parse(listDirStr) as ListDirResult;
  const tsFiles = result.files.filter(f => f.endsWith('.ts')); // ✅ 型エラーなし

  const symbolsStr = await getSymbolsOverview({ relative_path: 'src/index.ts' });
  const symbols = JSON.parse(symbolsStr) as GetSymbolsOverviewResult;
  symbols.forEach(s => console.log(s.name_path, s.kind)); // ✅ 型エラーなし

  await closeClient();
}
```

## 補足: SymbolKindの値と意味

調査時に`kind`の値と意味の対応も記録してください:

```typescript
enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}
```

※ 上記は一般的なLSP (Language Server Protocol)のSymbolKind。Serenaが使用している値は異なる可能性があります。

## 参考情報

- プロジェクトルート: `/Users/user/dev/obsidian-plugin`
- Serenaスキルディレクトリ: `.claude/skills/mcp-code-execution`
- 問題が発生しているスクリプト: `src/analyze-parser-data-flow.ts`
