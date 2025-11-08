# 使用例

このスキルの詳細な使用例を示します。すべての例は実際に動作するコードです。

## 基本テンプレート

すべてのスクリプトの基本構造：

```typescript
import { /* 必要なツール */ } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    // ここにコードを記述

  } catch (error) {
    if (error instanceof Error) {
      console.error('エラー:', error.message);
    }
  } finally {
    await closeClient();  // 必ず呼び出す
  }
}

main();
```

## 例 1: コードベース内のすべてのエクスポートされたクラスを検索

**タスク**: 「クラスをエクスポートしているすべての TypeScript ファイルを検索」

### 従来の MCP（非効率）
```
→ listDir（1000 ファイルがコンテキストに）
→ 各ファイルに getSymbolsOverview（1000 結果がコンテキストに）
→ LLM が手動で結果をフィルタリング
= 50,000 トークン以上消費
```

### このスキル（効率的）

**ファイル**: `src/find-classes.ts`

```typescript
import { listDir, getSymbolsOverview } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    // ステップ1: すべての TypeScript ファイルを取得
    const result = await listDir({
      relative_path: 'src',
      recursive: true
    });
    const tsFiles = result.files.filter(f => f.endsWith('.ts'));

    console.log(`${tsFiles.length} 個の TypeScript ファイルを検索中...`);

    // ステップ2: 各ファイルのシンボルを確認
    const filesWithClasses = [];
    for (const file of tsFiles) {
      const symbols = await getSymbolsOverview({ relative_path: file });

      // kind === 5 はクラスを示す
      const hasClass = symbols.some(s => s.kind === 5);

      if (hasClass) {
        filesWithClasses.push(file);
      }
    }

    // ステップ3: 最終結果のみ出力（中間データは LLM に到達しない）
    console.log(`\nクラスをエクスポートしているファイル:`);
    filesWithClasses.forEach(file => console.log(`  - ${file}`));
    console.log(`\n合計: ${filesWithClasses.length} ファイル`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('エラー:', error.message);
    }
  } finally {
    await closeClient();
  }
}

main();
```

**実行:**
```bash
bun run src/find-classes.ts
```

**結果:**
- コンテキストには最終的なサマリーのみ（20トークン程度）
- 50,000 トークン → 20 トークン = **99.96% 削減**

---

## 例 2: 検証付きバッチリファクタリング

**タスク**: 「複数ファイルで `oldName` を `newName` にすべて置換」

**ファイル**: `src/rename-symbol.ts`

```typescript
import { findReferencingSymbols, renameSymbol } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    const symbolToRename = 'oldFunctionName';
    const newName = 'newFunctionName';
    const sourceFile = 'src/main.ts';

    // ステップ1: 影響範囲を確認
    console.log(`"${symbolToRename}" の参照を検索中...`);
    const refs = await findReferencingSymbols({
      name_path: symbolToRename,
      relative_path: sourceFile
    });

    console.log(`\n影響を受けるファイル: ${refs.length} 箇所`);
    refs.forEach(ref => console.log(`  - ${ref.file}:${ref.line}`));

    // ステップ2: ユーザー確認（実際のスクリプトでは自動実行）
    console.log(`\n"${symbolToRename}" を "${newName}" に変更します...`);

    // ステップ3: リファクタリング実行
    await renameSymbol({
      name_path: symbolToRename,
      relative_path: sourceFile,
      new_name: newName
    });

    console.log(`\n✓ リファクタリング完了！`);
    console.log(`  ${refs.length} 箇所で "${newName}" に変更されました`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('エラー:', error.message);
    }
  } finally {
    await closeClient();
  }
}

main();
```

**実行:**
```bash
bun run src/rename-symbol.ts
```

**利点:**
- 影響範囲を事前確認（安全なリファクタリング）
- すべての参照を自動更新
- 中間データはコード内で処理

---

## 例 3: プライバシーを保護したデータフロー

**タスク**: 「設定ファイルの API キーを分析し、件数のみ報告」

**ファイル**: `src/audit-api-keys.ts`

```typescript
import { findFile, searchForPattern } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    console.log('設定ファイルを検索中...');

    // ステップ1: すべての .env ファイルを検索
    const configs = await findFile({
      file_mask: '*.env',
      relative_path: '.'
    });

    console.log(`${configs.files.length} 個の設定ファイルを発見`);

    // ステップ2: API キーのパターンを検索
    // 重要: 実際のキーはコード内に留まり、LLM に到達しない
    let keyCount = 0;
    const fileStats = [];

    for (const file of configs.files) {
      const matches = await searchForPattern({
        substring_pattern: 'API_KEY=.*',
        relative_path: file
      });

      if (matches.length > 0) {
        keyCount += matches.length;
        fileStats.push({ file, count: matches.length });
      }
    }

    // ステップ3: 集計結果のみ出力（キーの値は出力しない）
    console.log(`\n=== API キー監査結果 ===`);
    console.log(`合計: ${keyCount} 個の API キーを発見\n`);

    console.log('ファイル別内訳:');
    fileStats.forEach(stat => {
      console.log(`  - ${stat.file}: ${stat.count} 個`);
    });

    if (keyCount > 0) {
      console.log(`\n⚠️  API キーが見つかりました。適切に管理されているか確認してください。`);
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('エラー:', error.message);
    }
  } finally {
    await closeClient();
  }
}

main();
```

**実行:**
```bash
bun run src/audit-api-keys.ts
```

**プライバシー保護:**
- 実際の API キーの値は LLM コンテキストに到達しない
- 件数と場所のみ報告
- 機密データはコード内で処理

---

## 例 4: 大規模データセットのフィルタリング

**タスク**: 「1000 個のファイルから特定条件のものだけを抽出」

**ファイル**: `src/filter-large-dataset.ts`

```typescript
import { listDir, getSymbolsOverview } from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    // ステップ1: すべてのファイルを取得（1000+ ファイル）
    const allFiles = await listDir({
      relative_path: 'src',
      recursive: true
    });

    const tsFiles = allFiles.files.filter(f => f.endsWith('.ts'));
    console.log(`${tsFiles.length} 個のファイルを分析中...`);

    // ステップ2: コード内でフィルタリング（LLM に全データを送らない）
    const results = [];

    for (const file of tsFiles) {
      const symbols = await getSymbolsOverview({ relative_path: file });

      // 条件: エクスポートされた関数が 5 個以上
      const exportedFunctions = symbols.filter(s =>
        s.kind === 2 && s.name.startsWith('export')
      );

      if (exportedFunctions.length >= 5) {
        results.push({
          file,
          functionCount: exportedFunctions.length,
          functions: exportedFunctions.map(f => f.name)
        });
      }
    }

    // ステップ3: フィルタリング済みの結果のみ出力
    console.log(`\n=== 分析結果 ===`);
    console.log(`条件に一致: ${results.length}/${tsFiles.length} ファイル\n`);

    results.forEach(r => {
      console.log(`${r.file}: ${r.functionCount} 個の関数`);
      r.functions.forEach(fn => console.log(`  - ${fn}`));
      console.log();
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('エラー:', error.message);
    }
  } finally {
    await closeClient();
  }
}

main();
```

**効果:**
- 1000 ファイル × 平均 10 シンボル = 10,000 データポイント
- コード内でフィルタリング後、50 個程度のデータのみ LLM に
- **トークン削減: 99.5%**

---

## 例 5: 複雑なマルチツールワークフロー

**タスク**: 「古いパターンを検索 → リファクタリング → 検証」

**ファイル**: `src/refactor-workflow.ts`

```typescript
import {
  searchForPattern,
  findSymbol,
  replaceSymbolBody,
  findReferencingSymbols
} from '../servers/serena/index.js';
import { closeClient } from './client.js';

async function main() {
  try {
    // ステップ1: 古いパターンを検索
    console.log('古いパターンを検索中...');
    const oldPattern = await searchForPattern({
      substring_pattern: 'var\\s+\\w+\\s*=',  // 古い var 宣言
      relative_path: 'src'
    });

    console.log(`${oldPattern.length} 箇所で古い var 宣言を発見`);

    // ステップ2: 各箇所を分析
    const toFix = [];
    for (const match of oldPattern) {
      const symbol = await findSymbol({
        name_path: match.symbolName,
        relative_path: match.file
      });

      // 簡単にリファクタリングできるか判定
      if (symbol.scope === 'function') {
        toFix.push({ ...match, symbol });
      }
    }

    console.log(`${toFix.length} 箇所をリファクタリング可能`);

    // ステップ3: リファクタリング実行
    for (const item of toFix) {
      const newBody = item.symbol.body.replace(/var\s+/, 'const ');

      await replaceSymbolBody({
        name_path: item.symbolName,
        relative_path: item.file,
        body: newBody
      });
    }

    // ステップ4: 検証
    console.log('\n検証中...');
    const verification = await searchForPattern({
      substring_pattern: 'var\\s+\\w+\\s*=',
      relative_path: 'src'
    });

    console.log(`\n✓ リファクタリング完了！`);
    console.log(`  修正前: ${oldPattern.length} 箇所`);
    console.log(`  修正後: ${verification.length} 箇所`);
    console.log(`  削減: ${oldPattern.length - verification.length} 箇所`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('エラー:', error.message);
    }
  } finally {
    await closeClient();
  }
}

main();
```

**複雑なワークフロー:**
- 検索 → 分析 → リファクタリング → 検証
- 5つ以上のツールを組み合わせ
- すべての中間データはコード内で処理

---

## 実行のベストプラクティス

### 1. エラーハンドリング
必ず try-catch-finally を使用：

```typescript
try {
  // ツール呼び出し
} catch (error) {
  console.error('エラー:', error.message);
} finally {
  await closeClient();  // 必ず実行
}
```

### 2. 進捗表示
大規模処理では進捗を表示：

```typescript
for (let i = 0; i < files.length; i++) {
  if (i % 10 === 0) {
    console.log(`進捗: ${i}/${files.length} ファイル処理済み`);
  }
  // 処理...
}
```

### 3. データフィルタリング
LLM に送る前に必ずフィルタリング：

```typescript
// ✓ 良い例
const filtered = allData.filter(d => d.important);
console.log(filtered);  // 重要なデータのみ

// ✗ 悪い例
console.log(allData);  // すべてのデータを出力
```

### 4. メモリ効率
大規模データはチャンク処理：

```typescript
const CHUNK_SIZE = 100;
for (let i = 0; i < files.length; i += CHUNK_SIZE) {
  const chunk = files.slice(i, i + CHUNK_SIZE);
  // chunk を処理
}
```

---

## さらに詳しい情報

- **技術詳細**: [REFERENCE.md](REFERENCE.md)
- **利用可能なツール**: [TOOLS.md](TOOLS.md)
- **型定義**: `servers/serena/*.ts`
