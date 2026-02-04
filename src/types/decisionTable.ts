/**
 * Decision Table Types
 * Used for Tier 2 rule authoring - spreadsheet-style condition matrices
 */

export interface DecisionTableColumn {
  /** Unique identifier for the column */
  id: string;
  /** "input" = condition column, "output" = result column */
  type: 'input' | 'output';
  /** Dot-path to the data field: "patient.age", "encounter.type" */
  field: string;
  /** Human-readable label: "Patient Age", "Encounter Type" */
  label: string;
  /** Data type hint for parsing cell values */
  dataType: 'string' | 'number' | 'boolean' | 'date';
}

export interface DecisionTableRow {
  /** Unique identifier for the row */
  id: string;
  /** Map of column ID -> cell expression string */
  cells: Record<string, string>;
}

export interface DecisionTable {
  /** Unique identifier for the table */
  id: string;
  /** Human-readable table name */
  name: string;
  /** Optional description */
  description?: string;
  /** "first" = first matching row wins, "collect" = gather all matches */
  hitPolicy: 'first' | 'collect';
  /** Column definitions */
  columns: DecisionTableColumn[];
  /** Row data */
  rows: DecisionTableRow[];
  /** Optional category for organization */
  category?: string;
}

/**
 * Cell expression syntax examples:
 * - Empty or "*" -> Match any (wildcard)
 * - "gold" -> Exact match
 * - "> 100" -> Greater than
 * - ">= 50" -> Greater than or equal
 * - "100..500" -> Between (inclusive)
 * - "US, CA, UK" -> One of (list)
 * - "!= blocked" -> Not equal
 * - "true" / "false" -> Boolean
 */
