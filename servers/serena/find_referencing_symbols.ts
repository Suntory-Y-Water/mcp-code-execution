import { callMCPTool } from '../../src/client.js';

type FindReferencingSymbolsInput = {
  name_path: string;
  relative_path: string;
  include_kinds?: unknown[];
  exclude_kinds?: unknown[];
  max_answer_chars?: number;
};

/**
 * Finds references to the symbol at the given `name_path`. The result will contain metadata about the referencing symbols
 * as well as a short code snippet around the reference. Returns a list of JSON objects with the symbols referencing the requested symbol.
 */
export async function findReferencingSymbols(
  input: FindReferencingSymbolsInput,
): Promise<unknown> {
  return await callMCPTool('find_referencing_symbols', input);
}
