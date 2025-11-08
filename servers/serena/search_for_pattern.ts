import { callMCPTool } from '../../src/client.js';

type SearchForPatternInput = {
  substring_pattern: string;
  context_lines_before?: number;
  context_lines_after?: number;
  paths_include_glob?: string;
  paths_exclude_glob?: string;
  relative_path?: string;
  restrict_search_to_code_files?: boolean;
  max_answer_chars?: number;
};

/**
 * searchForPatternツールの戻り値型
 *
 * キーがファイルパス、値がマッチした行の配列
 */
export type SearchForPatternResult = {
  [filePath: string]: string[];
};

/**
 * Offers a flexible search for arbitrary patterns in the codebase, including the
 * possibility to search in non-code files.
 * Generally, symbolic operations like find_symbol or find_referencing_symbols
 * should be preferred if you know which symbols you are looking for.
 *
 * Pattern Matching Logic:
 *     For each match, the returned result will contain the full lines where the
 *     substring pattern is found, as well as optionally some lines before and after it. The pattern will be compiled with
 *     DOTALL, meaning that the dot will match all characters including newlines.
 *     This also means that it never makes sense to have .* at the beginning or end of the pattern,
 *     but it may make sense to have it in the middle for complex patterns.
 *     If a pattern matches multiple lines, all those lines will be part of the match.
 *     Be careful to not use greedy quantifiers unnecessarily, it is usually better to use non-greedy quantifiers like .*? to avoid
 *     matching too much content.
 *
 * File Selection Logic:
 *     The files in which the search is performed can be restricted very flexibly.
 *     Using `restrict_search_to_code_files` is useful if you are only interested in code symbols (i.e., those
 *     symbols that can be manipulated with symbolic tools like find_symbol).
 *     You can also restrict the search to a specific file or directory,
 *     and provide glob patterns to include or exclude certain files on top of that.
 *     The globs are matched against relative file paths from the project root (not to the `relative_path` parameter that
 *     is used to further restrict the search).
 *     Smartly combining the various restrictions allows you to perform very targeted searches. Returns A mapping of file paths to lists of matched consecutive lines.
 */
export async function searchForPattern(
  input: SearchForPatternInput,
): Promise<SearchForPatternResult> {
  return await callMCPTool('search_for_pattern', input);
}
