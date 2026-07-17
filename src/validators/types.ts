/**
 * Validation Framework Types
 *
 * Consistent response shapes for all validators.
 * Pattern ported from EplanMCP validators.py.
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
