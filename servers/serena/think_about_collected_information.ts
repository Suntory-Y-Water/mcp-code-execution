import { callMCPTool } from '../../src/client.js';

type ThinkAboutCollectedInformationInput = Record<string, never>;

/**
 * Think about the collected information and whether it is sufficient and relevant.
 * This tool should ALWAYS be called after you have completed a non-trivial sequence of searching steps like
 * find_symbol, find_referencing_symbols, search_files_for_pattern, read_file, etc.
 */
export async function thinkAboutCollectedInformation(
  input: ThinkAboutCollectedInformationInput,
): Promise<unknown> {
  return await callMCPTool('think_about_collected_information', input);
}
