/**
 * `dsh-dmp` — data-management-plan scaffolding, checks and export.
 *
 * Three tools: dmp_scaffold, dmp_check, dmp_export. Pure local documents; no
 * network and no file writes.
 *
 * Function plugin — no default export.
 * @module dsh-dmp
 */

import type { Context } from '@deepseek-ai/cordis'
import { Config, resolveConfig, type Config as ConfigShape } from './config.ts'
import { makeDmpCheckTool } from './tools/dmp-check.ts'
import { makeDmpExportTool } from './tools/dmp-export.ts'
import { makeDmpScaffoldTool } from './tools/dmp-scaffold.ts'

/** Cordis plugin name. */
export const name = 'dmp'

/** The tool registry is a hard requirement. */
export const inject = ['tools']

export { Config, resolveConfig }
export type { ConfigShape }
export type { ResolvedConfig } from './config.ts'
export { VERSION } from './version.ts'
export { checkPlan, REQUIRED_SECTIONS, retentionYearsOf, scaffoldPlan, SECTION_PROMPTS } from './plan.ts'
export type { DatasetEntry, DmpCheckResult, DmpIssue, DmpPlan, PlanSections } from './plan.ts'
export { renderCheckSarif, renderPlanMarkdown } from './report.ts'
export { makeDmpScaffoldTool } from './tools/dmp-scaffold.ts'
export { makeDmpCheckTool } from './tools/dmp-check.ts'
export { makeDmpExportTool } from './tools/dmp-export.ts'

/**
 * Mount the three tools.
 * @param ctx - the plugin context (host).
 * @param config - raw plugin config.
 */
export function apply(ctx: Context, config: ConfigShape): void {
  const resolved = resolveConfig(config)
  const logger = ctx.logger('dmp')
  if (!resolved.enabled) {
    logger.info('disabled: enabled is false — no tools are mounted')
    return
  }
  ctx.effect(() => ctx.tools.register(makeDmpScaffoldTool()), 'dmp: dmp_scaffold tool')
  ctx.effect(() => ctx.tools.register(makeDmpCheckTool(resolved)), 'dmp: dmp_check tool')
  ctx.effect(() => ctx.tools.register(makeDmpExportTool(resolved)), 'dmp: dmp_export tool')
}
