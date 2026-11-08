/**
 * `dmp_check` — completeness and consistency checks.
 * @module dsh-dmp/tools/dmp-check
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { checkPlan, type DmpPlan } from '../plan.ts'
import type { ResolvedConfig } from '../config.ts'
import { ERROR_SCHEMA, asPlan, planProblem, retentionProblem } from './shared.ts'

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    check: { type: 'json' },
    error: ERROR_SCHEMA,
  },
} as const

/**
 * Build the `dmp_check` tool.
 * @param config - resolved plugin config.
 * @returns the tool definition.
 */
export function makeDmpCheckTool(config: ResolvedConfig) {
  return defineTool({
    name: 'dmp_check',
    description: [
      'Check a data-management plan for completeness and internal consistency (dsh-dmp).',
      '',
      'Flags missing sections, datasets without repository/license/DOI, personal data without security or legal basis, open sharing of personal data without de-identification, retention below the configured minimum (default 5 years — verify the funder), and storage without backup. It does not certify compliance with any funder template.',
    ].join('\n'),
    parameters: {
      plan: { type: 'json', required: true, description: 'The plan object (from dmp_scaffold, after editing).' },
      minRetentionYears: { type: 'number', description: 'Override the configured minimum retention.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as { ok: true; check: { complete: boolean; coverage: number; issues: Array<{ severity: string }> } } | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `dmp_check failed (${result.error.code}): ${result.error.message}` }]
        const errors = result.check.issues.filter(issue => issue.severity === 'error').length
        return [{ type: 'text', text: `dmp_check: ${result.check.complete ? 'complete' : 'incomplete'}; coverage ${(result.check.coverage * 100).toFixed(0)}%; ${errors} error(s), ${result.check.issues.length - errors} warning/info` }]
      },
    },
    async execute(args: unknown) {
      if (typeof args !== 'object' || args === null) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: 'pass the plan object from dmp_scaffold' } }
      }
      const request = args as { plan?: DmpPlan; minRetentionYears?: number }
      const problem = planProblem(request.plan)
      if (problem !== undefined) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: `pass the plan object from dmp_scaffold (${problem})` } }
      }
      const retentionIssue = retentionProblem(request.minRetentionYears)
      if (retentionIssue !== undefined) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: retentionIssue } }
      }
      return {
        ok: true as const,
        check: checkPlan(asPlan(request.plan), { minRetentionYears: request.minRetentionYears ?? config.minRetentionYears }) as never,
      }
    },
  })
}
