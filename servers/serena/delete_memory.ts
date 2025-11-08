import { callMCPTool } from '../../src/client.js';

type DeleteMemoryInput = {
  memory_file_name: string;
};

/**
 * Delete a memory file. Should only happen if a user asks for it explicitly,
 * for example by saying that the information retrieved from a memory file is no longer correct
 * or no longer relevant for the project.
 */
export async function deleteMemory(input: DeleteMemoryInput): Promise<unknown> {
  return await callMCPTool('delete_memory', input);
}
