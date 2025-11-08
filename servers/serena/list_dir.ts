import { callMCPTool } from '../../src/client.js';

type ListDirInput = {
  relative_path: string;
  recursive: boolean;
  skip_ignored_files?: boolean;
  max_answer_chars?: number;
};

/**
 * listDirツールの戻り値型
 */
export type ListDirResult = {
  dirs: string[];
  files: string[];
};

/**
 * Lists files and directories in the given directory (optionally with recursion). Returns a JSON object with the names of directories and files within the given directory.
 */
export async function listDir(input: ListDirInput): Promise<ListDirResult> {
  return await callMCPTool('list_dir', input);
}
