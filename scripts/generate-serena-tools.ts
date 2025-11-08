import { initClient, closeClient } from '../src/client.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

type JsonSchemaProperty = {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
};

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
};

/**
 * JSON SchemaからTypeScriptの型定義を生成
 */
function jsonSchemaToTypeScript(params: {
  schema: JsonSchema;
  typeName: string;
}): string {
  const { schema, typeName } = params;
  const properties = schema.properties || {};
  const required = schema.required || [];

  // プロパティが空の場合は Record<string, never> を使用
  if (Object.keys(properties).length === 0) {
    return `type ${typeName} = Record<string, never>;`;
  }

  const fields = Object.entries(properties).map(([key, prop]) => {
    const isRequired = required.includes(key);
    const optional = isRequired ? '' : '?';

    let tsType: string;
    switch (prop.type) {
      case 'string':
        tsType = 'string';
        break;
      case 'boolean':
        tsType = 'boolean';
        break;
      case 'integer':
      case 'number':
        tsType = 'number';
        break;
      case 'object':
        tsType = 'Record<string, unknown>';
        break;
      case 'array':
        tsType = 'unknown[]';
        break;
      default:
        tsType = 'unknown';
    }

    return `  ${key}${optional}: ${tsType};`;
  });

  return `type ${typeName} = {\n${fields.join('\n')}\n};`;
}

/**
 * ツール名をキャメルケースの関数名に変換
 */
function toFunctionName(toolName: string): string {
  return toolName
    .split('_')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');
}

/**
 * ツール名をパスカルケースの型名に変換
 */
function toTypeName(toolName: string): string {
  return toolName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * 個別のツールファイルを生成
 */
function generateToolFile(tool: ToolDefinition): string {
  const functionName = toFunctionName(tool.name);
  const inputTypeName = `${toTypeName(tool.name)}Input`;
  const inputType = jsonSchemaToTypeScript({
    schema: tool.inputSchema,
    typeName: inputTypeName,
  });

  const description = tool.description
    .split('\n')
    .map((line: string) => ` * ${line}`)
    .join('\n');

  return `import { callMCPTool } from '../../src/client.js';

${inputType}

/**
${description}
 */
export async function ${functionName}(input: ${inputTypeName}): Promise<unknown> {
  return await callMCPTool('${tool.name}', input);
}
`;
}

/**
 * index.ts を生成
 */
function generateIndexFile(tools: ToolDefinition[]): string {
  const exports = tools
    .map((tool) => `export * from './${tool.name}.js';`)
    .join('\n');

  return `// Auto-generated file. Do not edit manually.
// Generated from Serena MCP server tool definitions.

${exports}
`;
}

async function main() {
  console.log('🚀 Serena MCP ツール自動生成を開始します...\n');

  // MCP サーバーに接続
  const client = await initClient();
  console.log('✅ Serena MCP サーバーに接続しました\n');

  // ツール一覧を取得
  const result = await client.listTools();
  const tools = result.tools as ToolDefinition[];
  console.log(`📦 ${tools.length} 個のツールを検出しました\n`);

  // servers/serena ディレクトリを作成（存在しない場合）
  const serenaDir = join(process.cwd(), 'servers', 'serena');
  await mkdir(serenaDir, { recursive: true });

  // 各ツールのファイルを生成
  for (const tool of tools) {
    const fileName = `${tool.name}.ts`;
    const filePath = join(serenaDir, fileName);
    const content = generateToolFile(tool);

    await writeFile(filePath, content, 'utf-8');
    console.log(`✅ 生成完了: ${fileName}`);
  }

  // index.ts を生成
  const indexPath = join(serenaDir, 'index.ts');
  const indexContent = generateIndexFile(tools);
  await writeFile(indexPath, indexContent, 'utf-8');
  console.log(`\n✅ index.ts を生成しました`);

  await closeClient();

  console.log(`\n🎉 完了！${tools.length} 個のツールを生成しました`);
  console.log(`📁 生成先: ${serenaDir}\n`);
}

main().catch((error) => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
