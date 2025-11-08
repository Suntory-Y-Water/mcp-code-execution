import { callMCPTool } from '../../src/client.js';
import type { SymbolKind, SymbolLocation } from './types.js';

type GetSymbolsOverviewInput = {
  relative_path: string;
  max_answer_chars?: number;
};

/**
 * getSymbolsOverviewツールの戻り値に含まれるシンボル情報
 */
export type SymbolInfo = {
  name_path: string;
  kind: SymbolKind;
  body_location: SymbolLocation;
  relative_path: string;
};

/**
 * getSymbolsOverviewツールの戻り値型
 */
export type GetSymbolsOverviewResult = SymbolInfo[];

/**
 * Use this tool to get a high-level understanding of the code symbols in a file.
 * This should be the first tool to call when you want to understand a new file, unless you already know
 * what you are looking for. Returns a JSON object containing info about top-level symbols in the file.
 */
export async function getSymbolsOverview(
  input: GetSymbolsOverviewInput,
): Promise<GetSymbolsOverviewResult> {
  return await callMCPTool('get_symbols_overview', input);
}
