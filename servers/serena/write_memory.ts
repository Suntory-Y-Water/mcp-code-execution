import { callMCPTool } from '../../src/client.js';

type WriteMemoryInput = {
  memory_file_name: string;
  content: string;
  max_answer_chars?: number;
};

/**
 * Write some information (utf-8-encoded) about this project that can be useful for future tasks to a memory in md format.
 * The memory name should be meaningful.
 */
export async function writeMemory(input: WriteMemoryInput): Promise<unknown> {
  return await callMCPTool('write_memory', input);
}
