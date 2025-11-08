# 複数プロジェクト間での Serena MCP 利用時の制約

## 概要

Serena MCP Skill を使用して、異なるプロジェクト（`obsidian-plugin`）の parser フォルダの解析を試みたが、プロジェクトコンテキストの不一致により失敗した事象の詳細レポート。

## 実施日時

2025-11-08

## テスト環境

### 実行環境
- **Skill 実行プロジェクト**: `/Users/user/.claude/skills/mcp-code-execution`
- **解析対象プロジェクト**: `/Users/user/dev/obsidian-plugin`
- **解析対象ディレクトリ**: `packages/parser/src`

### 使用ツール
- Serena MCP ツール: `listDir`, `getSymbolsOverview`, `findSymbol`
- 実行方法: TypeScript スクリプト（`src/analyze-parser.ts`）

## 実施内容

### 目的

mcp-code-execution Skill を使って、別プロジェクトの parser フォルダのコード構造を解析し、以下を抽出する:

1. ファイル構造の一覧
2. 各ファイルのシンボル情報（関数、型定義、変数）
3. メイン関数の処理フロー
4. 依存関係

### 実装したスクリプト

```typescript
import { listDir, getSymbolsOverview, findSymbol } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    // parser/src ディレクトリの構造を取得
    const parserPath = 'packages/parser/src';
    const dirResult = await listDir({
      relative_path: parserPath,
      recursive: true
    });

    // ... 以下、解析処理
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await closeClient();
  }
}
```

## 発生した問題

### エラー内容

```json
{
  "error": "Directory not found: packages/parser/src",
  "project_root": "/Users/user/.claude/skills/mcp-code-execution",
  "hint": "Check if the path is correct relative to the project root"
}
```

### エラーの原因

#### 1. プロジェクトコンテキストの不一致

Serena MCP サーバーは、Skill が実行されているプロジェクト（`mcp-code-execution`）をアクティブプロジェクトとして認識する。

**Serena のログから:**
```
INFO  serena.agent:load_project_from_path_or_name:443 -
Found registered project 'mcp-code-execution' at path
/Users/user/.claude/skills/mcp-code-execution
```

#### 2. 相対パス解釈の制約

`listDir` などのツールに渡す `relative_path` パラメータは、**アクティブプロジェクトのルートディレクトリからの相対パス**として解釈される。

- **期待した解釈**: `/Users/user/dev/obsidian-plugin/packages/parser/src`
- **実際の解釈**: `/Users/user/.claude/skills/mcp-code-execution/packages/parser/src`

#### 3. プロジェクト指定パラメータの不在

Serena MCP ツールの型定義を確認したところ、以下のようなパラメータは存在しない:

- `project_path`: 別プロジェクトのパスを指定
- `absolute_path`: 絶対パスでの指定

試みた修正:
```typescript
const dirResult = await listDir({
  relative_path: parserPath,
  recursive: true,
  project_path: projectRoot  // ❌ このパラメータは存在しない
});
```

結果:
```
オブジェクト リテラルは既知のプロパティのみ指定できます。
'project_path' は型 'ListDirInput' に存在しません。
```

## 根本原因の分析

### Serena MCP の設計思想

Serena MCP は以下の前提で設計されている:

1. **単一プロジェクトフォーカス**: 常に1つのアクティブプロジェクトのコンテキスト内で動作
2. **プロジェクトルートベース**: すべてのパス指定はプロジェクトルートからの相対パス
3. **プロジェクト切り替え機能**: 複数プロジェクトを扱う場合は `activate_project` で明示的に切り替え

### 利用可能なプロジェクト一覧（ログから）

```
Available projects:
  .claude, cc-vault, clasp-gas-webapp-demo, inori-track,
  obsidian-plugin, mcp-code-execution,
  mcp-code-execution, yonayona-dinner
```

**注目点**: `obsidian-plugin` は登録されているが、アクティブではない。

## 解決策の候補

### 案1: プロジェクト切り替えを使用（理論上可能だが未検証）

事前に対象プロジェクトに切り替えてから解析を実行する。

**[注意] 以下は実際に検証していない推測コードです:**
```typescript
import { activateProject, listDir, getSymbolsOverview } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    // プロジェクトを切り替え（動作未確認）
    await activateProject({
      project_name: 'obsidian-plugin'
    });

    // 切り替え後は相対パスが正しく解釈される（理論上）
    const dirResult = await listDir({
      relative_path: 'packages/parser/src',
      recursive: true
    });

    // ... 解析処理
  } finally {
    await closeClient();
  }
}
```

**制約事項:**
- Serena の設定ファイル（`~/.serena/serena_config.yml`）でのプロジェクト登録が必要
- IDE assistant コンテキストでは `activate_project` が除外されている
  ```
  ToolInclusionDefinition excluded 2 tools:
    activate_project, get_current_config
  ```
- **実装例は検証していない**: `activate_project` の存在は確認できたが、実際の使用方法やパラメータは未確認

### 案2: 対象プロジェクト内で Skill を実行

Skill 自体を対象プロジェクト内に配置または移動する。

**メリット:**
- プロジェクトコンテキストが自動的に一致
- 相対パス指定がそのまま機能

**デメリット:**
- Skill の再利用性が低下
- プロジェクトごとに Skill をコピーする必要がある

### 案3: Claude Code 標準ツールを使用

Serena MCP を経由せず、Claude Code の標準ツール（Read, Grep, Glob）で解析する。

**実装例:**
```typescript
// 標準ツールを使った実装
const files = await glob('**/*.ts', {
  cwd: '/Users/user/dev/obsidian-plugin/packages/parser/src'
});

for (const file of files) {
  const content = await readFile(file);
  // ... 解析処理
}
```

**メリット:**
- プロジェクト境界を超えて動作
- 絶対パス指定が可能

**デメリット:**
- Serena のトークン削減効果が得られない
- シンボル解析機能が使えない

## 実際の対処

最終的に **案3（標準ツール使用）** を採用し、以下のツールで解析を実施:

```typescript
// Read ツールでファイル内容を取得
await Read({ file_path: '/Users/user/dev/obsidian-plugin/packages/parser/src/index.ts' });
await Read({ file_path: '/Users/user/dev/obsidian-plugin/packages/parser/src/utils/playwright.ts' });
await Read({ file_path: '/Users/user/dev/obsidian-plugin/packages/parser/src/utils/article-extractor.ts' });

// Glob ツールでファイル一覧を取得
await Glob({
  pattern: '**/*.ts',
  path: '/Users/user/dev/obsidian-plugin/packages/parser'
});
```

## 学んだこと

### Serena MCP の適用範囲

#### 適している用途

- **単一プロジェクト内での大規模解析**
  - 数百〜数千ファイルのバッチ処理
  - コードベース全体のリファクタリング
  - シンボル間の依存関係分析

#### 適していない用途

- **複数プロジェクト間のコード比較**
  - プロジェクト切り替えのオーバーヘッドが発生
  - 相対パス管理が複雑になる

- **1〜2ファイルの簡単な解析**
  - 標準ツールの方が直感的で効率的

### トークン削減の効果が発揮される条件

Serena MCP のトークン削減効果（最大 98.7%）は以下の条件で発揮される:

1. **大量のファイル処理**: 100ファイル以上
2. **シンボルレベルの解析**: `getSymbolsOverview`, `findSymbol` の活用
3. **データフィルタリング**: コード内で結果を絞り込んでから出力
4. **単一プロジェクト内**: プロジェクト切り替えが不要

### IDE assistant コンテキストの制約

Serena の設定ログから判明した除外ツール:

```
SerenaAgentContext[name='ide-assistant'] excluded 5 tools:
  create_text_file, read_file, execute_shell_command,
  prepare_for_new_conversation, replace_regex

ToolInclusionDefinition excluded 2 tools:
  activate_project, get_current_config
```

**影響:**
- `activate_project` が使えないため、案1の実装ができない
- プロジェクト切り替えには別のアプローチが必要

## 推奨事項

### Serena MCP Skill を使うべき場合

1. **解析対象が Skill と同じプロジェクト内にある**
2. **大量のファイル（100個以上）を処理する**
3. **シンボルレベルの詳細な解析が必要**
4. **トークン消費を最小限に抑えたい**

### 標準ツールを使うべき場合

1. **異なるプロジェクトのコードを解析する**
2. **少数のファイル（1〜10個程度）を読む**
3. **絶対パス指定が必要**
4. **プロジェクト登録が煩雑**

### ハイブリッドアプローチ

状況に応じて使い分ける:

- **探索フェーズ**: 標準ツール（Grep, Glob）で対象を特定
- **詳細解析フェーズ**: Serena MCP でシンボル解析とリファクタリング

## まとめ

### 事象の要約

Serena MCP Skill は単一プロジェクトのコンテキスト内での操作に特化しており、異なるプロジェクトのコードを解析するには、プロジェクト切り替えまたは標準ツールの使用が必要。

### 今後の対応

1. **プロジェクト切り替え機能の検証**: `activate_project` が IDE assistant コンテキストで利用可能かを確認
2. **Skill の配置戦略**: 汎用 Skill と プロジェクト固有 Skill の使い分けを検討
3. **ドキュメント整備**: Serena MCP の適用範囲と制約を明確化

## 参考情報

### 関連ファイル

- スクリプト: `/Users/user/.claude/skills/mcp-code-execution/src/analyze-parser.ts`
- Serena 設定: `~/.serena/serena_config.yml`
- ログ: `~/.serena/logs/2025-11-08/mcp_20251108-142339.txt`

### 解析対象プロジェクト構成

```
obsidian-plugin/
└── packages/
    └── parser/
        └── src/
            ├── index.ts              # メインエントリーポイント
            ├── types/
            │   └── index.ts          # 型定義
            └── utils/
                ├── playwright.ts      # ブラウザ操作
                └── article-extractor.ts # 記事抽出
```

### 参考ドキュメント

- [Serena MCP TOOLS.md](../TOOLS.md)
- [Serena MCP EXAMPLES.md](../EXAMPLES.md)
- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
