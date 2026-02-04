// Type declarations for json-logic-js
// This module doesn't ship with TypeScript types

declare module 'json-logic-js' {
  interface JsonLogicStatic {
    /**
     * Apply a JSONLogic rule to a data object
     * @param logic The JSONLogic rule object
     * @param data The data object to evaluate against
     * @returns The result of applying the logic
     */
    apply(logic: any, data?: any): any;

    /**
     * Add a custom operation to json-logic-js
     * @param name The operation name
     * @param fn The operation implementation
     */
    add_operation(name: string, fn: (...args: any[]) => any): void;

    /**
     * Remove a custom operation
     * @param name The operation name to remove
     */
    rm_operation(name: string): void;

    /**
     * Check if a value is a JSONLogic rule object
     * @param logic The value to check
     */
    is_logic(logic: any): boolean;

    /**
     * Check if a value is truthy according to JSONLogic rules
     * @param value The value to check
     */
    truthy(value: any): boolean;

    /**
     * Get the operator from a JSONLogic rule object
     * @param logic The logic object
     */
    get_operator(logic: any): string;

    /**
     * Get the values array from a JSONLogic rule object
     * @param logic The logic object
     */
    get_values(logic: any): any[];

    /**
     * Get all data references (var operations) used in a rule
     * @param logic The logic object
     */
    uses_data(logic: any): string[];
  }

  const jsonLogic: JsonLogicStatic;
  export default jsonLogic;
  export = jsonLogic;
}
