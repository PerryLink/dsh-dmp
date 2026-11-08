/**
 * `dmp_export` — Markdown + JSON + SARIF.
 * @module dsh-dmp/tools/dmp-export
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { checkPlan, type DmpPlan } from '../plan.ts'
import { renderCheckSarif, renderPlanMarkdown } from '../report.ts'
import type { ResolvedConfig } from '../config.ts'
import { VERSION } from '../version.ts'
import { ERROR_SCHEMA } from './shared.ts'

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    markdown: { type: 'string' },
    check: { type: 'json' },
    sarif: { type: 'json' },
    error: ERROR_SCHEMA,
  },
} as const

/**
 * Build the `dmp_export` tool.
 * @param config - resolved plugin config.
 * @returns the tool definition.
 */
export function makeDmpExportTool(config: ResolvedConfig) {
  return defineTool({
    name: 'dmp_export',
    description: [
      'Export a data-management plan as Markdown with its checks, plus SARIF (dsh-dmp).',
      '',
      'The Markdown contains the identity block, the dataset table, all ten sections and the issue table. It repeats that checks are completeness/consistency checks, not funder certification.',
    ].join('\n'),
    parameters: {
      plan: { type: 'json', required: true, description: 'The plan object.' },
      minRetentionYears: { type: 'number', description: 'Override the configured minimum retention.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as { ok: true; markdown: string } | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `dmp_export failed (${result.error.code}): ${result.error.message}` }]
        return [{ type: 'text', text: result.markdown }]
      },
    },
    async execute(args: unknown) {
      const request = args as { plan?: DmpPlan; minRetentionYears?: number }
      if (request.plan === undefined || request.plan.sections === undefined) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: 'pass the plan object' } }
      }
      const check = checkPlan(request.plan, { minRetentionYears: request.minRetentionYears ?? config.minRetentionYears })
      return {
        ok: true as const,
        markdown: renderPlanMarkdown(request.plan, check),
        check: check as never,
        sarif: renderCheckSarif(check, VERSION) as never,
      }
    },
  })
}
