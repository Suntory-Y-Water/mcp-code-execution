import { callMCPTool } from '../../src/client.js';

type InsertBeforeSymbolInput = {
  name_path: string;
  relative_path: string;
  body: string;
};

/**
 * Inserts the given content before the beginning of the definition of the given symbol (via the symbol's location).
 * A typical use case is to insert a new class, function, method, field or variable assignment; or
 * a new import statement before the first symbol in the file.
 */
export async function insertBeforeSymbol(
  input: InsertBeforeSymbolInput,
): Promise<unknown> {
  return await callMCPTool('insert_before_symbol', input);
}
