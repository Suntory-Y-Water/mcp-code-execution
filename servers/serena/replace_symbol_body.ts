import { callMCPTool } from '../../src/client.js';

type ReplaceSymbolBodyInput = {
  name_path: string;
  relative_path: string;
  body: string;
};

/**
 * Replaces the body of the symbol with the given `name_path`.
 *
 * The tool shall be used to replace symbol bodies that have been previously retrieved
 * (e.g. via `find_symbol`).
 * IMPORTANT: Do not use this tool if you do not know what exactly constitutes the body of the symbol.
 */
export async function replaceSymbolBody(
  input: ReplaceSymbolBodyInput,
): Promise<unknown> {
  return await callMCPTool('replace_symbol_body', input);
}
