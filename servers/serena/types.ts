/**
 * Serena MCPツールの共通型定義
 */

/**
 * シンボルの種類を表す文字列リテラル型
 */
export type SymbolKind =
  | 'File'
  | 'Module'
  | 'Namespace'
  | 'Package'
  | 'Class'
  | 'Method'
  | 'Property'
  | 'Field'
  | 'Constructor'
  | 'Enum'
  | 'Interface'
  | 'Function'
  | 'Variable'
  | 'Constant'
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Array'
  | 'Object'
  | 'Key'
  | 'Null'
  | 'EnumMember'
  | 'Struct'
  | 'Event'
  | 'Operator'
  | 'TypeParameter';

/**
 * シンボルの位置情報
 */
export type SymbolLocation = {
  start_line: number;
  end_line: number;
};
