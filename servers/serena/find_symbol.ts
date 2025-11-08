import { callMCPTool } from '../../src/client.js';
import type { SymbolKind, SymbolLocation } from './types.js';

type FindSymbolInput = {
  name_path: string;
  depth?: number;
  relative_path?: string;
  include_body?: boolean;
  include_kinds?: SymbolKind[];
  exclude_kinds?: SymbolKind[];
  substring_matching?: boolean;
  max_answer_chars?: number;
};

/**
 * findSymbolツールの戻り値に含まれるシンボル情報
 */
export type FindSymbolResultItem = {
  name_path: string;
  kind: SymbolKind;
  body_location: SymbolLocation;
  relative_path: string;
};

/**
 * findSymbolツールの戻り値型
 */
export type FindSymbolResult = FindSymbolResultItem[];

/**
 * Retrieves information on all symbols/code entities (classes, methods, etc.) based on the given `name_path`,
 * which represents a pattern for the symbol's path within the symbol tree of a single file.
 * The returned symbol location can be used for edits or further queries.
 * Specify `depth > 0` to retrieve children (e.g., methods of a class).
 *
 * The matching behavior is determined by the structure of `name_path`, which can
 * either be a simple name (e.g. "method") or a name path like "class/method" (relative name path)
 * or "/class/method" (absolute name path). Note that the name path is not a path in the file system
 * but rather a path in the symbol tree **within a single file**. Thus, file or directory names should never
 * be included in the `name_path`. For restricting the search to a single file or directory,
 * the `within_relative_path` parameter should be used instead. The retrieved symbols' `name_path` attribute
 * will always be composed of symbol names, never file or directory names.
 *
 * Key aspects of the name path matching behavior:
 * - Trailing slashes in `name_path` play no role and are ignored.
 * - The name of the retrieved symbols will match (either exactly or as a substring)
 *   the last segment of `name_path`, while other segments will restrict the search to symbols that
 *   have a desired sequence of ancestors.
 * - If there is no starting or intermediate slash in `name_path`, there is no
 *   restriction on the ancestor symbols. For example, passing `method` will match
 *   against symbols with name paths like `method`, `class/method`, `class/nested_class/method`, etc.
 * - If `name_path` contains a `/` but doesn't start with a `/`, the matching is restricted to symbols
 *   with the same ancestors as the last segment of `name_path`. For example, passing `class/method` will match against
 *   `class/method` as well as `nested_class/class/method` but not `method`.
 * - If `name_path` starts with a `/`, it will be treated as an absolute name path pattern, meaning
 *   that the first segment of it must match the first segment of the symbol's name path.
 *   For example, passing `/class` will match only against top-level symbols like `class` but not against `nested_class/class`.
 *   Passing `/class/method` will match against `class/method` but not `nested_class/class/method` or `method`. Returns a list of symbols (with locations) matching the name.
 */
export async function findSymbol(
  input: FindSymbolInput,
): Promise<FindSymbolResult> {
  return await callMCPTool('find_symbol', input);
}
