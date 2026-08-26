/**
 * Validation Framework Types
 *
 * Consistent response shapes for all validators.
 * Every validator returns the same result shape, so callers can aggregate
 * results without special-casing which validator produced them.
 */

export interface ValidationResult {
  valid: boolean;
  message: string;
  details: Record<string, unknown>;
}

export interface BatchValidationResult {
  total: number;
  passed: number;
  failed: number;
  results: Array<{ type: string; input: string; result: ValidationResult }>;
}
