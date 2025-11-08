# MCP Code Execution Skillの検証記録

## きっかけ

Anthropicの記事「[Code execution with MCP: building more efficient AI agents](https://www.anthropic.com/engineering/code-execution-with-mcp)」を読みました。

Claude CodeでMCPを登録すると、登録されているMCPのすべてのToolsがContextに反映され、初期状態でContext量を圧迫する問題があります。この記事では、MCPツールをTypeScriptコードとして実行することでトークン消費を最大98.7%削減できる（150,000トークン → 2,000トークン）こと、中間データをLLMコンテキストに含めず最終結果のみを返すアプローチが紹介されていました。

このアプローチに興味を持ち、Serena MCPの20個のツール（`listDir`, `findFile`, `getSymbolsOverview`など）をTypeScriptコードから呼び出せるClaude Code Skillを実装しました（[mcp-code-execution](https://github.com/Suntory-Y-Water/mcp-code-execution)）。必要なツールのみをオンデマンドでインポートし、コード内でデータを処理してから最終結果のみをLLMに返すことで、トークン消費を大幅に削減できます。

## 検証の目的

実装したSkillを使って、既存のSerena MCP（直接ツール呼び出し）とコード実行方式のコンテキスト消費量を実測値として比較したいと考えました。仮説として、同じSerena MCPツールを使用しても、コード実行方式のほうがコンテキスト消費量が少なくなるのではないかと考えていました。

検証対象として`test-parser`プロジェクトのparserディレクトリ（TypeScriptファイル10個未満）を選定しました。小規模で検証に適しており、Serena MCPと同様の水準でシンボル解析できるか試験でき、実測値の比較に十分な複雑さがあると判断しました。

## 検証内容

`test-parser`プロジェクトのparserディレクトリに対して、以下の3つのタスクを順次実行する計画を立てました。

1. ディレクトリ構造の取得（`listDir`）
2. TypeScriptファイルの一覧化（`findFile`）
3. シンボル情報の抽出（`getSymbolsOverview`）

Serena MCP直接呼び出しと比較して、コンテキスト消費量の削減率（目標: 50%以上削減）を確認すること、中間データがLLMコンテキストに含まれないこと、最終結果のみが返されることを検証したいと考えていました。

前提条件として、`test-parser`プロジェクト内に`.claude/skills/mcp-code-execution`を配置すれば、Serenaが正しくプロジェクトルートを認識し、相対パス指定でparser配下のファイルを解析できると想定していました。

## 実装と実行

Claude Code公式ドキュメントによると、`.claude/skills/`に配置されたプロジェクトスキルは、そのプロジェクトのコンテキストで実行されます。そのため、プロジェクトスキルとして配置すれば、Serenaは親プロジェクトをルートとして認識するだろうと考えました。

まず、`test-parser`プロジェクト内に`.claude/skills/mcp-code-execution`を配置し、検証スクリプト`src/analyze-parser.ts`を作成しました。当初は3つのタスクを順次実行する予定でしたが、まず最初のタスク（ディレクトリ構造の取得）を実装して動作を確認することにしました。

```
test-parser/                                 ← 期待するプロジェクトルート
├── .claude/
│   └── skills/
│       └── mcp-code-execution/              ← Skillを配置
│           ├── src/
│           │   └── analyze-parser.ts        ← 検証スクリプト
│           ├── servers/serena/              ← 生成されたツール
│           └── SKILL.md
└── parser/                                  ← 解析対象
    └── src/
        ├── file1.ts
        ├── file2.ts
        └── ...
```

検証スクリプトでは、相対パス`'parser'`を指定して`listDir`を呼び出しました。期待動作としては、`/Users/.../test-parser/parser`が解釈されるはずです。成功すれば、タスク2（`findFile`）、タスク3（`getSymbolsOverview`）を実装する予定でした。

```typescript
import { listDir } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    const result = await listDir({
      relative_path: 'parser',
      recursive: true,
    });
    console.log('Parser directory contents:', result);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
  } finally {
    await closeClient();
  }
}

main();
```

セットアップとして`bun install`、`bun run scripts/generate-serena-tools.ts`を実行した後、`bun run src/analyze-parser.ts`でスクリプトを実行しました。

## 結果：失敗とその原因

タスク1（ディレクトリ構造の取得）の実行時にエラーが発生しました。

```
Error: Directory not found: parser
```

このため、タスク2（TypeScriptファイルの一覧化）とタスク3（シンボル情報の抽出）は実行できませんでした。

Serenaのログ出力を確認したところ、以下のように記録されていました。

```
INFO serena.agent:load_project_from_path_or_name:443 -
Found registered project 'mcp-code-execution' at path
/Users/user/dev/test-parser/.claude/skills/mcp-code-execution
```

Serenaは**Skillディレクトリ自身**をプロジェクトルートとして認識していました。つまり、期待していたのは`/Users/user/dev/test-parser`をプロジェクトルートとして認識し、相対パス`'parser'`を`/Users/user/dev/test-parser/parser`と解釈することでしたが、実際には`/Users/user/dev/test-parser/.claude/skills/mcp-code-execution`をプロジェクトルートとして認識し、相対パス`'parser'`を`/Users/user/dev/test-parser/.claude/skills/mcp-code-execution/parser`と解釈していました。当然、この場所にはparserディレクトリは存在しません。

```
test-parser/
├── .claude/
│   └── skills/
│       └── mcp-code-execution/      ← Serenaが認識したルート
│           └── parser/              ← ここを探してしまう（存在しない）
└── parser/                          ← 本当はここを探したい
```

## 判明した技術的制約

今回の検証で、MCP Code Execution Skillを使った別プロジェクトのコード解析には3つの技術的制約があることが明らかになりました。

**制約1: Skillディレクトリがプロジェクトルートとして認識される**

MCP Code Execution Skillは、スクリプトが配置されているディレクトリ（Skillディレクトリ）をプロジェクトルートとして認識します。そのため、親ディレクトリ（`.claude/skills/`の外）のファイルにアクセスできません。Serenaはスクリプト実行時のカレントディレクトリではなく、Skillが配置されているディレクトリをプロジェクトルートとして認識する設計になっています。

**制約2: プロジェクト切り替えツールが利用できない**

IDE assistantコンテキストでは`activate_project`ツールが除外されています。

```
ToolInclusionDefinition excluded 2 tools:
  activate_project, get_current_config
```

そのため、別プロジェクトを明示的に指定する方法がありません。

**制約3: 相対パスの解釈基準が変更できない**

相対パスは常にSerenaが認識したプロジェクトルート（= Skillディレクトリ）からの解釈となります。絶対パス指定もSerenaのAPI仕様上サポートされていないため、回避策がありません。

## 結論と今後の方針

当初の目的「Serena MCP直接呼び出しとMCP Code Execution Skillのコンテキスト消費量比較」は、最初のタスクで技術的制約に遭遇したため実施できませんでした。MCP Code Execution Skillは同一プロジェクト内での使用を前提としており、プロジェクト横断的な解析には適していないことが分かりました。

別プロジェクトのコード解析には、Claude Codeの標準ツール（Read, Grep, Glob）を使用するべきです。これらのツールは絶対パス指定が可能であり、プロジェクト境界を超えて動作します。また、今回のような小規模な解析（10ファイル未満）ではトークン削減効果が限定的であるため、標準ツールで十分だと判断しました。

```typescript
// Claude Code標準ツールでの実装例
await Glob({ pattern: "parser/**/*.ts" })
await Read({ file_path: "/Users/user/dev/test-parser/parser/file1.ts" })
await Grep({ pattern: "parse|transform|validate", path: "parser" })
```

### MCP Code Execution Skillが適している場合

以下の条件をすべて満たす場合にのみ、MCP Code Execution Skillの使用を検討してください。

**Skillディレクトリ内のファイルを操作する場合**です。例えば、`.claude/skills/mcp-code-execution/src/`配下のリファクタリングや、Skill自身のコードベース分析などが該当します。

**大規模なファイル数を処理する場合**です。100個以上のファイルを処理する場合、トークン削減効果が顕著になります。

**プライバシー保護が必要な場合**です。機密データを含む大規模データセット処理において、中間結果をLLMコンテキストに含めたくない場合に有効です。

## 参考ドキュメント

- `docs/2025-11-08_複数プロジェクト間でのSerena_MCP利用時の制約.md`
- `docs/2025-11-08_スキルのプロジェクトルート制約による失敗事例.md`
- `docs/2025-11-08_claude-code-skill.md`
