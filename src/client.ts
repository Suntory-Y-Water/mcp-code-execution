import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

let globalClient: Client | null = null;

/**
 * プロジェクトルートを決定します。
 *
 * 経緯:
 * - Personal Skills (~/.claude/skills/) の場合、相対パスでプロジェクトルートを特定できない
 *   理由: どのプロジェクトから実行されるか不明なため
 * - Project Skills (.claude/skills/) の場合、../../ でプロジェクトルートを特定可能
 * - Personal Skillsでデフォルトの相対パス解決を試みると ~/.claude/ がルートになりバグる
 *
 * 解決策:
 * 1. 環境変数 SERENA_PROJECT_ROOT が設定されていれば優先使用
 * 2. Project Skillの場合は ../../ で自動解決
 * 3. Personal Skillで環境変数未設定はエラー
 */
const projectRoot = (() => {
  // 環境変数が設定されていれば優先
  if (process.env.SERENA_PROJECT_ROOT) {
    return process.env.SERENA_PROJECT_ROOT;
  }

  // このファイルの場所を特定
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Project Skillかどうかを判定
  // Project Skill: /path/to/project/.claude/skills/mcp-code-execution/src/client.ts
  // Personal Skill: ~/.claude/skills/mcp-code-execution/src/client.ts
  const isProjectSkill = __dirname.includes('/.claude/skills/');

  if (isProjectSkill) {
    // Project Skillの場合は ../../../.. で解決
    // src → mcp-code-execution → skills → .claude → project root
    return resolve(__dirname, '../../../..');
  }

  // Personal Skillで環境変数未設定はエラー
  throw new Error(
    '環境変数 SERENA_PROJECT_ROOT が設定されていません。\n' +
      'Personal Skill (~/.claude/skills/) を使用する場合は必須です。\n\n' +
      '設定方法:\n' +
      '1. 環境変数で指定: export SERENA_PROJECT_ROOT=/path/to/your/project\n' +
      '2. .env ファイルで指定: echo "SERENA_PROJECT_ROOT=/path/to/your/project" > .env',
  );
})();

/**
 * Serena MCP サーバへの接続を初期化します。
 * グローバルクライアントとして管理され、複数回呼び出しても1つの接続のみ確立します。
 */
export async function initClient(): Promise<Client> {
  if (globalClient) {
    return globalClient;
  }

  // Serena MCP サーバの起動設定
  const transport = new StdioClientTransport({
    command: 'uvx',
    args: [
      '--from',
      'git+https://github.com/oraios/serena',
      'serena',
      'start-mcp-server',
      '--context',
      'ide-assistant',
      '--project',
      projectRoot,
      '--enable-web-dashboard=false',
    ],
  });

  globalClient = new Client(
    {
      name: 'mcp-code-executor',
      version: '0.1.0',
    },
    {
      capabilities: {},
    },
  );

  await globalClient.connect(transport);

  return globalClient;
}

/**
 * MCP ツールを呼び出すヘルパー関数
 */
export async function callMCPTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown>,
): Promise<T> {
  const client = await initClient();

  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });

  // MCP の結果をパース
  if (Array.isArray(result.content) && result.content.length > 0) {
    const firstContent = result.content[0];
    if (firstContent.type === 'text') {
      try {
        return JSON.parse(firstContent.text) as T;
      } catch (error) {
        if (error instanceof Error) {
          console.error('エラー:', error.message);
        }
        // JSON パースに失敗した場合はそのまま返す
        return firstContent.text as T;
      }
    }
  }

  return result as T;
}

/**
 * クライアント接続を閉じます。
 * スクリプト終了時に呼び出してください。
 */
export async function closeClient(): Promise<void> {
  if (globalClient) {
    await globalClient.close();
    globalClient = null;
  }
}
