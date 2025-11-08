# 利用可能なツール

自動生成された TypeScript ラッパーを通じて、全 20 の Serena MCP ツールが利用可能です。

すべてのツールは `servers/serena/index.ts` からインポートできます：

```typescript
import { listDir, findFile, getSymbolsOverview } from '../servers/serena/index.js';
```

## ファイル操作

### `listDir(input)`
ファイルとディレクトリの一覧を取得します。

**入力例:**
```typescript
await listDir({
  relative_path: 'src',
  recursive: true
});
```

### `findFile(input)`
パターン/マスクでファイルを検索します。

**入力例:**
```typescript
await findFile({
  file_mask: '*.ts',
  relative_path: 'src'
});
```

### `searchForPattern(input)`
ファイル内の正規表現パターンを検索します。

**入力例:**
```typescript
await searchForPattern({
  substring_pattern: 'export.*function',
  relative_path: 'src/index.ts'
});
```

## シンボル操作

### `getSymbolsOverview(input)`
ファイル内のトップレベルシンボルを取得します。

**用途:** ファイルの構造を理解する、エクスポートされた関数/クラスを検索

**入力例:**
```typescript
await getSymbolsOverview({
  relative_path: 'src/index.ts'
});
```

### `findSymbol(input)`
シンボルを検索して本体を含む詳細を読み取ります。

**用途:** 特定の関数やクラスの実装を取得

**入力例:**
```typescript
await findSymbol({
  name_path: 'myFunction',
  relative_path: 'src/utils.ts'
});
```

### `findReferencingSymbols(input)`
シンボルへのすべての参照を検索します。

**用途:** リファクタリング前に影響範囲を確認

**入力例:**
```typescript
await findReferencingSymbols({
  name_path: 'oldName',
  relative_path: 'src/main.ts'
});
```

## コード編集

### `replaceSymbolBody(input)`
シンボルの実装を置換します。

**用途:** 関数やメソッドの本体を書き換え

**入力例:**
```typescript
await replaceSymbolBody({
  name_path: 'myFunction',
  relative_path: 'src/utils.ts',
  body: 'return "new implementation";'
});
```

### `insertAfterSymbol(input)`
シンボルの後にコードを挿入します。

**用途:** 新しいメソッドや関数を既存コードの後に追加

**入力例:**
```typescript
await insertAfterSymbol({
  name_path: 'existingFunction',
  relative_path: 'src/utils.ts',
  body: 'function newFunction() { ... }'
});
```

### `insertBeforeSymbol(input)`
シンボルの前にコードを挿入します。

**用途:** インポート文の追加、前置き関数の追加

**入力例:**
```typescript
await insertBeforeSymbol({
  name_path: 'mainFunction',
  relative_path: 'src/index.ts',
  body: 'import { helper } from "./helper";'
});
```

### `renameSymbol(input)`
コードベース全体でシンボルの名前を変更します。

**用途:** リファクタリング、変数・関数名の統一

**入力例:**
```typescript
await renameSymbol({
  name_path: 'oldName',
  relative_path: 'src/main.ts',
  new_name: 'newName'
});
```

## メモリ操作

### `writeMemory(input)`
後で使う情報を保存します。

**用途:** セッション間で情報を保持、学習内容の蓄積

**入力例:**
```typescript
await writeMemory({
  memory_file_name: 'project-structure',
  content: '{ "src": "source files", "tests": "test files" }'
});
```

### `readMemory(input)`
以前保存した情報を取得します。

**入力例:**
```typescript
await readMemory({
  memory_file_name: 'project-structure'
});
```

### `listMemories(input)`
保存されたすべてのメモリを一覧します。

**用途:** 保存された情報の確認

**入力例:**
```typescript
await listMemories({});
```

### `deleteMemory(input)`
メモリを削除します。

**入力例:**
```typescript
await deleteMemory({
  memory_file_name: 'obsolete-key'
});
```

## メタツール

### `initialInstructions(input)`
Serena の使用方法を取得します。

**用途:** Serena MCP の基本的な使い方を確認

### `checkOnboardingPerformed(input)`
オンボーディング状態を確認します。

### `onboarding(input)`
Serena オンボーディングを実行します。

### `thinkAboutCollectedInformation(input)`
収集したデータを振り返ります。

**用途:** タスク完了前の情報整理

### `thinkAboutTaskAdherence(input)`
タスクの整合性を確認します。

**用途:** 元のタスク要件との一致を検証

### `thinkAboutWhetherYouAreDone(input)`
完了チェックを行います。

**用途:** タスク完了の判断

## 型定義

すべてのツールには MCP スキーマから自動生成された TypeScript 型があります。

詳細な型定義は `servers/serena/*.ts` ファイルを確認してください。

**例:**
```typescript
type ListDirInput = {
  relative_path: string;
  recursive: boolean;
  skip_ignored_files?: boolean;
  max_answer_chars?: number;
};
```

## 重要な注意事項

- インポートには `.js` 拡張子を使用: `from '../servers/serena/index.js'`
- スクリプトの最後に必ず `await closeClient()` を呼び出してください
