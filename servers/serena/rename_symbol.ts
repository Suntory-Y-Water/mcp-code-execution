import { callMCPTool } from '../../src/client.js';

type RenameSymbolInput = {
  name_path: string;
  relative_path: string;
  new_name: string;
};

/**
 * Renames the symbol with the given `name_path` to `new_name` throughout the entire codebase.
 * Note: for languages with method overloading, like Java, name_path may have to include a method's
 * signature to uniquely identify a method. Returns result summary indicating success or failure.
 */
export async function renameSymbol(input: RenameSymbolInput): Promise<unknown> {
  return await callMCPTool('rename_symbol', input);
}
