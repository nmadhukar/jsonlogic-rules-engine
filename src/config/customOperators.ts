/**
 * Custom JSONLogic Operators
 * Register these ONCE at app startup before any rule evaluation
 */

import jsonLogic from 'json-logic-js';
import { jsonLogicAdditionalOperators, defaultOperators } from 'react-querybuilder';
import type { FullOperator } from 'react-querybuilder';

let operatorsRegistered = false;

/**
 * All operators for react-querybuilder UI
 * Includes standard operators plus custom ones
 */
export const allOperators: FullOperator[] = [
  ...defaultOperators,
  { name: 'contains', value: 'contains', label: 'contains' },
  { name: 'startsWith', value: 'startsWith', label: 'starts with' },
  { name: 'endsWith', value: 'endsWith', label: 'ends with' },
  { name: 'between', value: 'between', label: 'between', arity: 2 as const },
];

/**
 * Register all custom operators with json-logic-js.
 * Call this ONCE at application startup (in main.tsx).
 * Safe to call multiple times - will only register once.
 */
export function registerCustomOperators(): void {
  if (operatorsRegistered) return;

  // Register react-querybuilder's additional operators (startsWith, endsWith, etc.)
  for (const [op, fn] of Object.entries(jsonLogicAdditionalOperators)) {
    jsonLogic.add_operation(op, fn);
  }

  // String operators
  jsonLogic.add_operation('contains', (a: string, b: string) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    return a.toLowerCase().includes(b.toLowerCase());
  });

  jsonLogic.add_operation('len', (a: string | any[]) => {
    if (a == null) return 0;
    return a.length;
  });

  jsonLogic.add_operation('upper', (a: string) => {
    if (typeof a !== 'string') return a;
    return a.toUpperCase();
  });

  jsonLogic.add_operation('lower', (a: string) => {
    if (typeof a !== 'string') return a;
    return a.toLowerCase();
  });

  jsonLogic.add_operation('trim', (a: string) => {
    if (typeof a !== 'string') return a;
    return a.trim();
  });

  // Math operators
  jsonLogic.add_operation('abs', (a: number) => Math.abs(a));
  jsonLogic.add_operation('floor', (a: number) => Math.floor(a));
  jsonLogic.add_operation('ceil', (a: number) => Math.ceil(a));
  jsonLogic.add_operation('round', (a: number, decimals?: number) => {
    if (decimals === undefined) return Math.round(a);
    const factor = Math.pow(10, decimals);
    return Math.round(a * factor) / factor;
  });

  // Array/collection operators
  jsonLogic.add_operation('count', (arr: any[]) => {
    if (!Array.isArray(arr)) return 0;
    return arr.length;
  });

  jsonLogic.add_operation('sum', (arr: number[]) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
  });

  jsonLogic.add_operation('avg', (arr: number[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return sum / arr.length;
  });

  // Utility operators
  jsonLogic.add_operation('isEmpty', (a: any) => {
    if (a == null) return true;
    if (typeof a === 'string') return a.trim() === '';
    if (Array.isArray(a)) return a.length === 0;
    if (typeof a === 'object') return Object.keys(a).length === 0;
    return false;
  });

  jsonLogic.add_operation('coalesce', (...args: any[]) => {
    for (const arg of args) {
      if (arg != null && arg !== '') return arg;
    }
    return null;
  });

  // Date operators
  jsonLogic.add_operation('now', () => new Date().toISOString());

  jsonLogic.add_operation('daysSince', (dateStr: string) => {
    if (!dateStr) return -1;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return -1;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  });

  jsonLogic.add_operation('daysBetween', (date1: string, date2: string) => {
    if (!date1 || !date2) return -1;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return -1;
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  });

  // Healthcare-specific: Age calculation from DOB
  jsonLogic.add_operation('ageInYears', (dobStr: string) => {
    if (!dobStr) return 0;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  });

  // Between operator: value between low and high (inclusive)
  jsonLogic.add_operation('between', (value: number, low: number, high: number) => {
    return value >= low && value <= high;
  });

  // Decision table "collect" mode operator
  // Accepts array of [condition, output] pairs (wrapped in extra array to prevent spreading)
  // Usage: { collect_table: [[[cond1, out1], [cond2, out2], ...]] }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  jsonLogic.add_operation('collect_table', (pairs: any[], _data: any) => {
    const results: any[] = [];
    for (const pair of pairs) {
      if (Array.isArray(pair) && pair.length === 2) {
        const [condition, output] = pair;
        // Condition is already evaluated by json-logic-js
        if (condition === true || jsonLogic.truthy(condition)) {
          results.push(output);
        }
      }
    }
    return results;
  });

  operatorsRegistered = true;
}
