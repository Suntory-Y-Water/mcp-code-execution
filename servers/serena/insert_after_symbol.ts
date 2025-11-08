import { callMCPTool } from '../../src/client.js';

type InsertAfterSymbolInput = {
  name_path: string;
  relative_path: string;
  body: string;
};

/**
 * Inserts the given body/content after the end of the definition of the given symbol (via the symbol's location).
 * A typical use case is to insert a new class, function, method, field or variable assignment.
 */
export async function insertAfterSymbol(
  input: InsertAfterSymbolInput,
): Promise<unknown> {
  return await callMCPTool('insert_after_symbol', input);
}
