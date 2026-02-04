/**
 * Rule Pipeline Types
 * Used for Tier 3 rule authoring - sequential step execution
 */

export interface PipelineStep {
  /** Unique key for referencing this step's output (e.g., "subtotal" -> $.subtotal) */
  key: string;
  /** Human-readable step name */
  name: string;
  /** The JSONLogic rule for this step */
  logic: any;
  /** Temporarily disable without deleting */
  enabled?: boolean;
  /** Optional description for business users */
  description?: string;
}

export interface RulePipeline {
  /** Unique identifier for the pipeline */
  id: string;
  /** Human-readable pipeline name */
  name: string;
  /** Optional description */
  description?: string;
  /** Ordered list of steps */
  steps: PipelineStep[];
  /** Optional category for organization */
  category?: string;
}

/**
 * Pipeline execution context:
 * - Input data is available at root level (e.g., patient.age)
 * - Each step's output is stored at $.key (e.g., $.subtotal)
 * - Later steps can reference earlier outputs via $.stepKey
 *
 * Example:
 * Step 1: key="subtotal" -> result stored at $.subtotal
 * Step 2: can reference { "var": "$.subtotal" }
 */
