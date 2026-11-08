/**
 * `dmp_scaffold` — a structured DMP template with section prompts.
 * @module dsh-dmp/tools/dmp-scaffold
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { scaffoldPlan, type DatasetEntry } from '../plan.ts'
import { ERROR_SCHEMA } from './shared.ts'

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    plan: { type: 'json' },
    error: ERROR_SCHEMA,
  },
} as const

/**
 * Build the `dmp_scaffold` tool.
 * @returns the tool definition.
 */
export function makeDmpScaffoldTool() {
  return defineTool({
    name: 'dmp_scaffold',
    description: [
      'Create a structured data-management-plan template (dsh-dmp).',
      '',
      'Returns the ten sections (data description, collection, documentation, storage/backup, security, sharing, retention, roles, legal basis, costs) filled with PROMPTS — not invented project content — plus optional dataset entries. Fill the strings, then run dmp_check.',
    ].join('\n'),
    parameters: {
      title: { type: 'string', description: 'Project title.' },
      funder: { type: 'string' },
      grantId: { type: 'string' },
      institution: { type: 'string' },
      contact: { type: 'string', description: 'Data steward / contact.' },
      datasets: { type: 'json', description: 'Optional [{name, type, format?, volume?, containsPersonalData?, repository?, license?, persistentId?}].' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as { ok: true; plan: { project: { title: string }; sections: Record<string, string> } } | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `dmp_scaffold failed (${result.error.code}): ${result.error.message}` }]
        return [{ type: 'text', text: `dmp_scaffold: "${result.plan.project.title}" — ${Object.keys(result.plan.sections).length} section prompts ready; fill them and run dmp_check.` }]
      },
    },
    async execute(args: unknown) {
      const request = args as { title?: string; funder?: string; grantId?: string; institution?: string; contact?: string; datasets?: DatasetEntry[] }
      return { ok: true as const, plan: scaffoldPlan(request) as never }
    },
  })
}
