/**
 * Config schema and resolution for `dsh-dmp`.
 * @module dsh-dmp/config
 */

import z from '@deepseek-ai/schemastery'

/** Raw plugin config. */
export interface Config {
  enabled?: boolean
  /** Default minimum retention in years (verify against the funder call). */
  minRetentionYears?: number
}

/** Fully resolved config. */
export interface ResolvedConfig {
  readonly enabled: boolean
  readonly minRetentionYears: number
}

/** Schemastery schema. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  minRetentionYears: z.number().default(5),
})

/**
 * Validate raw values and fill explicit defaults.
 * @param config - raw plugin config.
 * @returns the fully resolved config.
 */
export function resolveConfig(config: Config = {}): ResolvedConfig {
  const minRetentionYears = config.minRetentionYears ?? 5
  if (!Number.isFinite(minRetentionYears) || minRetentionYears <= 0) throw new TypeError('minRetentionYears must be a positive number')
  return { enabled: config.enabled ?? true, minRetentionYears }
}
