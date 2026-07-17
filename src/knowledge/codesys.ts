/**
 * Embedded knowledge: CODESYS-specific topics — Recipe Manager and hard-won
 * gotchas. (The CODESYS ground-truth lives in plcopen.ts / knowledge/codesys/.)
 */

import { loadKnowledge } from './loader.js';

export function getRecipeManager(): string {
  return loadKnowledge('codesys/recipe-manager.md');
}

export function getCodesysGotchas(): string {
  return loadKnowledge('codesys/gotchas.md');
}
