import { callMCPTool } from '../../src/client.js';

type ReadMemoryInput = {
  memory_file_name: string;
  max_answer_chars?: number;
};

/**
 * Read the content of a memory file. This tool should only be used if the information
 * is relevant to the current task. You can infer whether the information
 * is relevant from the memory file name.
 * You should not read the same memory file multiple times in the same conversation.
 */
export async function readMemory(input: ReadMemoryInput): Promise<unknown> {
  return await callMCPTool('read_memory', input);
}
