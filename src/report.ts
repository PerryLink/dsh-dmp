/**
 * Markdown and SARIF rendering for a data-management plan.
 * @module dsh-dmp/report
 */

import { REQUIRED_SECTIONS, type DmpCheckResult, type DmpPlan } from './plan.ts'

/** Escape a table cell. */
function cell(value: string): string {
  return value.replace(/\|/gu, '\\|').replace(/\n+/gu, ' ').trim()
}

/**
 * Render the plan and its check as Markdown.
 * @param plan - the plan.
 * @param check - the check result.
 * @returns Markdown text.
 */
export function renderPlanMarkdown(plan: DmpPlan, check: DmpCheckResult): string {
  const lines = [`# Data management plan — ${plan.project.title}`, '']
  const identity = [
    plan.project.funder === undefined ? undefined : `**Funder:** ${plan.project.funder}`,
    plan.project.grantId === undefined ? undefined : `**Grant:** ${plan.project.grantId}`,
    plan.project.institution === undefined ? undefined : `**Institution:** ${plan.project.institution}`,
    plan.project.contact === undefined ? undefined : `**Contact:** ${plan.project.contact}`,
  ].filter((value): value is string => value !== undefined)
  if (identity.length > 0) lines.push(identity.join(' · '), '')
  lines.push(`**Coverage:** ${(check.coverage * 100).toFixed(0)}% of the required sections · **complete:** ${check.complete ? 'yes' : 'no'}${check.retentionYears === undefined ? '' : ` · **retention:** ${check.retentionYears} years`}`)
  lines.push('')
  if ((plan.datasets ?? []).length > 0) {
    lines.push('## Datasets')
    lines.push('')
    lines.push('| Dataset | Type | Format | Volume | Personal data | Repository | License | Persistent ID |')
    lines.push('|---|---|---|---|---|---|---|---|')
    for (const dataset of plan.datasets ?? []) {
      lines.push(`| ${cell(dataset.name)} | ${cell(dataset.type)} | ${cell(dataset.format ?? '')} | ${cell(dataset.volume ?? '')} | ${dataset.containsPersonalData === true ? 'yes' : 'no'} | ${cell(dataset.repository ?? '')} | ${cell(dataset.license ?? '')} | ${cell(dataset.persistentId ?? '')} |`)
    }
    lines.push('')
  }
  for (const section of REQUIRED_SECTIONS) {
    const value = plan.sections[section.key]
    lines.push(`## ${section.label}`)
    lines.push('')
    lines.push(value === undefined || value.trim() === '' ? '_Not provided._' : value)
    lines.push('')
  }
  if (check.issues.length > 0) {
    lines.push('## Issues')
    lines.push('')
    lines.push('| Severity | Code | Detail | Suggestion |')
    lines.push('|---|---|---|---|')
    for (const issue of check.issues) lines.push(`| ${issue.severity} | ${issue.code} | ${cell(issue.detail)} | ${cell(issue.suggestion)} |`)
    lines.push('')
  }
  lines.push('> Checks are about completeness and internal consistency. They do not certify compliance with any funder template; verify the current call text.')
  return `${lines.join('\n')}\n`
}

/**
 * Render check issues as SARIF 2.1.0.
 * @param check - the check result.
 * @param version - plugin version.
 * @returns the SARIF log.
 */
export function renderCheckSarif(check: DmpCheckResult, version: string): Record<string, unknown> {
  const results = check.issues
    .filter(issue => issue.severity !== 'info')
    .map(issue => ({
      ruleId: `dmp/${issue.code}`,
      level: issue.severity === 'error' ? ('error' as const) : ('warning' as const),
      message: { text: `${issue.detail} — ${issue.suggestion}` },
      properties: { code: issue.code },
    }))
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'dsh-dmp', version } }, results }],
  }
}
