import { callMCPTool } from '../../src/client.js';

type FindFileInput = {
  file_mask: string;
  relative_path: string;
};

/**
 * Finds non-gitignored files matching the given file mask within the given relative path. Returns a JSON object with the list of matching files.
 */
export async function findFile(input: FindFileInput): Promise<unknown> {
  return await callMCPTool('find_file', input);
}
