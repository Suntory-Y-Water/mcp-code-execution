
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## 開発手法

### 契約による設計の実装指針

TypeScript環境での契約による設計の適切な実装方法

#### 基本原則

- **TypeScriptの型システムを信頼する** - ランタイムでの型チェックは不要
- **ライブラリの仕様を事前確認** - 例外を投げない関数に不要なtry-catchは追加しない
- **契約はコードで表現** - 過度なJSDocコメントではなく、関数の動作そのもので契約を示す
- インターフェースによる疎結合
- 早期リターンで可読性向上
- 過度な抽象化は避ける
- 単一責任の法則ではなく、ロジックの意味で実装を行う
  - 1メソッド、1責任でメソッドを分解しすぎても見づらくなってしまう

#### 避けるべき実装パターン

- 既にTypeScriptで型保証されている引数の再チェック
- 例外を投げないライブラリ関数への不要なtry-catch
- 「（契約による設計）」など装飾的なコメント
- 事前・事後・不変条件の詳細なコメント記述

#### 推奨する実装パターン

- 関数名と型定義で契約を明示
- シンプルで読みやすいコード構造
- 必要最小限のJSDocコメント
- 純粋関数としての実装（副作用なし）

#### 実装前チェックリスト

- [ ] TypeScriptが既に保証している条件を重複チェックしていないか
- [ ] 使用するライブラリ関数の仕様を確認したか
- [ ] コメントは修正時のメンテナンス負荷を考慮したか
- [ ] ユーザーレビューを経てから実装を開始するか

### テスト方針

- メソッドの事前条件、事後条件、不変条件を検証するテストであること
- Given-When-Thenパターンに基づいて実装すること

## 品質保証

### コーディング規約

- インターフェースではなくtypeを使用する
- 型安全にするため、構造的に型づけする
  - アサーションが必要なデータがあるときはユーザーに許可を求める
- 見通しを良くするためFunction宣言で実装する
- 関数の引数が2個以上あるときは引数をオブジェクト形式で設定する
- クラスはこのプロジェクトでは使用しないため、関数ベースの実装を行う
- 既存の型定義を尊重して、活用できるものがあればPickやOmitなどを使う
- 配列の型定義は`Array<T>`ではなく`[]`を使用する