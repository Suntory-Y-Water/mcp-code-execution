import { callMCPTool } from '../../src/client.js';

type ListMemoriesInput = Record<string, never>;

/**
 * List available memories. Any memory can be read using the `read_memory` tool.
 */
export async function listMemories(input: ListMemoriesInput): Promise<unknown> {
  return await callMCPTool('list_memories', input);
}
