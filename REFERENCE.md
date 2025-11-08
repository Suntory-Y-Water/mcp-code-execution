# 技術リファレンス

このドキュメントには、MCP コード実行スキルの技術的な詳細情報が含まれています。

## プロジェクト構造

```
mcp-code-execution/
├── SKILL.md              # メインのスキル定義（Claude が読む）
├── TOOLS.md              # 全ツールの詳細リスト
├── EXAMPLES.md           # 詳細な使用例
├── REFERENCE.md          # この技術リファレンス
├── README.md             # プロジェクト README
├── servers/serena/       # 自動生成された MCP ツール
│   ├── index.ts          # メインエクスポート (export *)
│   ├── list_dir.ts       # 個別のツールラッパー
│   ├── find_file.ts
│   └── ...               # 全20ツール
├── scripts/
│   └── generate-serena-tools.ts  # ツール生成スクリプト
├── src/
│   ├── client.ts         # MCP クライアント接続
│   └── *.ts              # ユーザースクリプト
├── package.json
└── tsconfig.json
```

## アーキテクチャ

### 仕組み

1. **ツール生成**: `generate-serena-tools.ts` が MCP サーバーに接続
2. **型安全なラッパー生成**: JSON Schema → TypeScript 型定義
3. **スクリプト実行**: Bun がスクリプトを実行
4. **MCP 通信**: `client.ts` が裏側で MCP サーバーと通信
5. **結果返却**: 最終結果のみがログに出力

### データフロー

```
ユーザースクリプト (src/*.ts)
    ↓ import
ツールラッパー (servers/serena/*.ts)
    ↓ callTool()
MCP クライアント (src/client.ts)
    ↓ StdioClientTransport
Serena MCP サーバー
    ↓ 結果
ユーザースクリプト
    ↓ console.log()
Claude / ユーザー
```

## 型システム

### 自動生成された型

すべてのツールには MCP スキーマから生成された TypeScript 型があります。

**例: ListDirInput**
```typescript
type ListDirInput = {
  relative_path: string;
  recursive: boolean;
  skip_ignored_files?: boolean;
  max_answer_chars?: number;
};
```

**生成ロジック**（`generate-serena-tools.ts`）:
- JSON Schema の properties → TypeScript フィールド
- required 配列 → 必須フィールド（オプションでない）
- 空のスキーマ → `Record<string, never>`
- ツールの description → JSDoc コメント

### 返り値の型

現在、すべてのツールは `Promise<unknown>` を返します。

**理由**: MCP プロトコルは返り値のスキーマを提供しないため

**手動での型精緻化が可能**:
```typescript
const result = await listDir({ relative_path: 'src' }) as {
  files: string[];
  directories: string[];
};
```

## MCP クライアント

### 接続管理

**グローバルシングルトン**:
- スクリプト実行ごとに 1 つのクライアントインスタンス
- `initClient()` で初期化（既存の接続を再利用）
- `closeClient()` で明示的にクローズ

**src/client.ts の重要な関数**:

```typescript
// クライアントを初期化（自動的に呼ばれる）
export async function initClient(): Promise<Client>

// ツールを呼び出し
export async function callTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown>

// クライアントを閉じる（必須）
export async function closeClient(): Promise<void>
```

### トランスポート設定

**現在の設定** (`src/client.ts`):
```typescript
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@oraios/serena']
});
```

**他の MCP サーバーへの変更**:
```typescript
const transport = new StdioClientTransport({
  command: 'your-mcp-server-command',
  args: ['--your', 'args']
});
```

## インポート規約

### .js 拡張子の使用

TypeScript/Bun では、インポートに `.js` 拡張子を使用します：

```typescript
// ✓ 正しい
import { listDir } from '../servers/serena/index.js';

// ✗ 間違い
import { listDir } from '../servers/serena/index';
import { listDir } from '../servers/serena/index.ts';
```

**理由**: TypeScript の ES Module 仕様に準拠

### 推奨されるインポートパターン

**必要なツールのみインポート**:
```typescript
// ✓ 良い（必要なもののみ）
import { listDir, findFile } from '../servers/serena/index.js';

// ✗ 悪い（全部インポート）
import * as serena from '../servers/serena/index.js';
```

**closeClient は必須**:
```typescript
import { closeClient } from './client.js';

// スクリプトの最後で必ず呼び出す
await closeClient();
```

## エラーハンドリング

### 推奨パターン

```typescript
async function main() {
  try {
    // ツール呼び出し
    const result = await listDir({ relative_path: 'src' });
    console.log(result);

  } catch (error) {
    // エラーを適切に処理
    if (error instanceof Error) {
      console.error('エラー:', error.message);
      console.error('スタック:', error.stack);
    } else {
      console.error('未知のエラー:', error);
    }

  } finally {
    // 必ず実行される（エラー時も）
    await closeClient();
  }
}

main();
```

### 一般的なエラー

**1. クライアントが閉じられていない**
```
Error: Client is not initialized
```
→ `await closeClient()` を呼び忘れた前回の実行が残っている

**2. インポートエラー**
```
Cannot find module '../servers/serena/index'
```
→ `.js` 拡張子を忘れている

**3. MCP サーバーエラー**
```
Error: Tool execution failed
```
→ Serena MCP サーバーが正しく動作していない

## パフォーマンス最適化

### 1. バッチ処理

大量のファイルを処理する場合、チャンク処理を使用：

```typescript
const CHUNK_SIZE = 50;
const results = [];

for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  const chunk = files.slice(i, i + CHUNK_SIZE);

  const chunkResults = await Promise.all(
    chunk.map(file => getSymbolsOverview({ relative_path: file }))
  );

  results.push(...chunkResults);

  // 進捗表示
  console.log(`進捗: ${Math.min(i + CHUNK_SIZE, files.length)}/${files.length}`);
}
```

### 2. 並列処理

独立したツール呼び出しは並列化：

```typescript
// ✓ 並列処理（高速）
const [files, symbols, patterns] = await Promise.all([
  listDir({ relative_path: 'src' }),
  getSymbolsOverview({ relative_path: 'index.ts' }),
  searchForPattern({ substring_pattern: 'export', relative_path: 'src' })
]);

// ✗ 順次処理（遅い）
const files = await listDir({ relative_path: 'src' });
const symbols = await getSymbolsOverview({ relative_path: 'index.ts' });
const patterns = await searchForPattern({ substring_pattern: 'export', relative_path: 'src' });
```

### 3. データフィルタリング

LLM に送る前に必ずフィルタリング：

```typescript
// すべてのファイルを取得（1000個）
const allFiles = await listDir({ relative_path: 'src', recursive: true });

// コード内でフィルタリング（10個に削減）
const importantFiles = allFiles.files.filter(f =>
  f.includes('important') && f.endsWith('.ts')
);

// フィルタリング済みのデータのみ出力
console.log(importantFiles);  // 10個のみ → 低トークン
```

## トラブルシューティング

### ツール生成に失敗する

**症状**: `generate-serena-tools.ts` がエラーを出す

**確認事項**:
1. Serena MCP サーバーがインストールされているか
2. `src/client.ts` の設定が正しいか
3. ネットワーク接続があるか

**デバッグ**:
```bash
# MCP サーバーを手動で起動して確認
npx -y @oraios/serena

# クライアント接続をテスト
bun run src/client.ts
```

### 型エラー

**症状**: TypeScript が型エラーを出す

**解決策**:
```bash
# リンターを実行
bun run lint

# 型定義を確認
cat servers/serena/list_dir.ts
```

### インポートエラー

**症状**: モジュールが見つからない

**チェックリスト**:
- ✓ `.js` 拡張子を使っているか
- ✓ パスが正しいか（`../servers/serena/index.js`）
- ✓ ツールが生成されているか（`ls servers/serena/`）

### ランタイムエラー

**症状**: 実行時にエラーが発生

**デバッグ手順**:
1. `try-catch` でエラーをキャッチ
2. `error.message` と `error.stack` を確認
3. MCP サーバーのログを確認

## 他の MCP サーバーへの拡張

### 手順

1. **`src/client.ts` を編集**:
```typescript
const transport = new StdioClientTransport({
  command: 'your-mcp-server-command',
  args: ['--your-args']
});
```

2. **ツール生成スクリプトを実行**:
```bash
bun run scripts/generate-serena-tools.ts
```

3. **（オプション）出力ディレクトリを変更**:
スクリプト内で `servers/serena/` を別のパスに変更可能

### 対応可能な MCP サーバー

- Serena MCP（コード認識）
- Filesystem MCP（ファイル操作）
- Database MCP（データベース操作）
- API MCP（REST API 呼び出し）
- その他、MCP プロトコルに準拠したサーバー

## セキュリティ考慮事項

### 機密データの保護

**コード内で処理**:
```typescript
// ✓ 安全（キーは LLM に到達しない）
const keys = await searchForPattern({ substring_pattern: 'API_KEY=.*' });
console.log(`発見: ${keys.length} 個`);

// ✗ 危険（キーの値が LLM に到達する）
const keys = await searchForPattern({ substring_pattern: 'API_KEY=.*' });
console.log(keys);  // 実際のキーが出力される
```

### スクリプトの検証

- 生成されたスクリプトは実行前に必ず確認
- 本番環境では慎重にテスト
- 重要なリファクタリングはバックアップを取る

## 参考資料

### 公式ドキュメント

- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Serena MCP](https://github.com/oraios/serena)
- [MCP Protocol](https://modelcontextprotocol.io/)

### 関連ファイル

- [TOOLS.md](TOOLS.md) - 全ツールリスト
- [EXAMPLES.md](EXAMPLES.md) - 詳細な使用例
- [SKILL.md](SKILL.md) - メインスキル定義
- [README.md](README.md) - プロジェクト README

## バージョン情報

**現在の設定**:
- Bun: 1.2+
- TypeScript: 5.9+
- MCP SDK: @modelcontextprotocol/sdk
- Serena MCP: @oraios/serena

**互換性**:
- Node.js での実行は未サポート（Bun 推奨）
- Windows/macOS/Linux 対応
