/**
 * Shared tool schema fragments and runtime argument guards.
 * @module dsh-dmp/tools/shared
 */

import { REQUIRED_SECTIONS, type DmpPlan } from '../plan.ts'

/** The failure branch. */
export const ERROR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', required: true },
    message: { type: 'string', required: true },
  },
} as const

/** True for a plain non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check that a value is structurally a plan before handing it to the pure
 * checkers. The tools receive model-supplied JSON, so a missing `project` or a
 * numeric section must become `INVALID_INPUT`, not a TypeError.
 * @param value - the candidate plan.
 * @returns a human-readable problem, or undefined when the plan is usable.
 */
export function planProblem(value: unknown): string | undefined {
  if (!isRecord(value)) return 'plan must be an object'
  if (value['version'] !== undefined && value['version'] !== 1) return 'plan.version must be 1'
  const project = value['project']
  if (!isRecord(project)) return 'plan.project must be an object'
  if (typeof project['title'] !== 'string' || project['title'].trim() === '') return 'plan.project.title must be a non-empty string'
  for (const key of ['funder', 'grantId', 'institution', 'contact']) {
    if (project[key] !== undefined && typeof project[key] !== 'string') return `plan.project.${key} must be a string`
  }
  const sections = value['sections']
  if (!isRecord(sections)) return 'plan.sections must be an object'
  for (const section of REQUIRED_SECTIONS) {
    if (sections[section.key] !== undefined && typeof sections[section.key] !== 'string') {
      return `plan.sections.${section.key} must be a string`
    }
  }
  const datasets = value['datasets']
  if (datasets !== undefined) {
    if (!Array.isArray(datasets)) return 'plan.datasets must be an array'
    for (const dataset of datasets) {
      if (!isRecord(dataset)) return 'plan.datasets entries must be objects'
      if (typeof dataset['name'] !== 'string' || dataset['name'].trim() === '') return 'dataset.name must be a non-empty string'
      if (typeof dataset['type'] !== 'string' || dataset['type'].trim() === '') return 'dataset.type must be a non-empty string'
      for (const key of ['format', 'volume', 'repository', 'license', 'persistentId']) {
        if (dataset[key] !== undefined && typeof dataset[key] !== 'string') return `dataset.${key} must be a string`
      }
      if (dataset['containsPersonalData'] !== undefined && typeof dataset['containsPersonalData'] !== 'boolean') {
        return 'dataset.containsPersonalData must be boolean'
      }
    }
  }
  return undefined
}

/**
 * Validate a per-call retention override.
 * @param value - the candidate value.
 * @returns a problem message, or undefined when it is a positive finite number.
 */
export function retentionProblem(value: unknown): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'minRetentionYears must be a positive number'
  return undefined
}

/** Cast a validated value for the typed plan helpers. */
export function asPlan(value: unknown): DmpPlan {
  return value as DmpPlan
}
