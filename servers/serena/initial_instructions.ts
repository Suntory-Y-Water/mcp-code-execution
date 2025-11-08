import { callMCPTool } from '../../src/client.js';

type InitialInstructionsInput = Record<string, never>;

/**
 * Provides the 'Serena Instructions Manual', which contains essential information on how to use the Serena toolbox.
 * Call this tool if you have not yet read this very important manual!.
 */
export async function initialInstructions(
  input: InitialInstructionsInput,
): Promise<unknown> {
  return await callMCPTool('initial_instructions', input);
}
