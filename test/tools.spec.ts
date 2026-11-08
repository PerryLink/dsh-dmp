/**
 * Tool surface: scaffold, check, export, failure branches.
 * @module test/tools.spec
 */

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { scaffoldPlan, type DmpPlan } from '../src/plan.ts'
import { makeDmpCheckTool } from '../src/tools/dmp-check.ts'
import { makeDmpExportTool } from '../src/tools/dmp-export.ts'
import { makeDmpScaffoldTool } from '../src/tools/dmp-scaffold.ts'
import { VERSION } from '../src/version.ts'

const EXEC = {} as never
const CONFIG = resolveConfig({})

/** A filled plan. */
function filled(): DmpPlan {
  const scaffold = scaffoldPlan({ title: 'T', contact: 'a@b.c' })
  return {
    ...scaffold,
    datasets: [{ name: 'd', type: 'tabular', repository: 'Zenodo', license: 'CC0', persistentId: '10.1/x' }],
    sections: {
      dataDescription: 'A tabular dataset with a codebook and README.',
      collection: 'Collected with a documented survey instrument.',
      documentation: 'Codebook plus README in the repository.',
      storage: 'Encrypted institutional storage with nightly backup.',
      security: 'Role-based access with encryption at rest.',
      sharing: 'Shared openly under CC0 in Zenodo.',
      retention: 'Retained for 10 years, then destroyed.',
      roles: 'Data steward named, PI approves access.',
      legal: 'Ethics approval and consent recorded.',
      costs: 'Repository fees covered by the grant.',
    },
  }
}

describe('tools', () => {
  it('declares names and schemas', () => {
    for (const [tool, name] of [
      [makeDmpScaffoldTool(), 'dmp_scaffold'],
      [makeDmpCheckTool(CONFIG), 'dmp_check'],
      [makeDmpExportTool(CONFIG), 'dmp_export'],
    ] as const) {
      expect(tool.name).toBe(name)
      expect(tool.output.schema).toBeDefined()
    }
  })

  it('scaffold → check → export end to end', async () => {
    const scaffolded = (await makeDmpScaffoldTool().execute({ title: 'T', contact: 'a@b.c' }, EXEC)) as { ok: true; plan: DmpPlan }
    expect(Object.keys(scaffolded.plan.sections)).toHaveLength(10)

    const checked = (await makeDmpCheckTool(CONFIG).execute({ plan: filled() }, EXEC)) as { ok: true; check: { complete: boolean } }
    expect(checked.check.complete).toBe(true)

    const exported = (await makeDmpExportTool(CONFIG).execute({ plan: filled() }, EXEC)) as {
      ok: true
      markdown: string
      sarif: { version: string }
    }
    expect(exported.markdown).toContain('Data management plan')
    expect(exported.markdown).toContain('Datasets')
    expect(exported.sarif.version).toBe('2.1.0')
  })

  it('checks a prompt-only scaffold as incomplete', async () => {
    const scaffolded = (await makeDmpScaffoldTool().execute({ title: 'T', contact: 'a@b.c' }, EXEC)) as { ok: true; plan: DmpPlan }
    const checked = (await makeDmpCheckTool(CONFIG).execute({ plan: scaffolded.plan }, EXEC)) as { ok: true; check: { complete: boolean; coverage: number } }
    expect(checked.check.complete).toBe(false)
    expect(checked.check.coverage).toBeLessThan(1)
  })

  it('failure branches carry stable codes', async () => {
    for (const args of [
      { plan: {} },
      { plan: { sections: {} } },
      { plan: { sections: {}, project: { title: 'T' }, datasets: [null] } },
      { plan: { sections: { dataDescription: 42 }, project: { title: 'T' } } },
      { plan: { sections: {}, project: { title: 'T' } }, minRetentionYears: -1 },
    ]) {
      const check = (await makeDmpCheckTool(CONFIG).execute(args, EXEC)) as { ok: false; error: { code: string } }
      expect(check.error.code).toBe('INVALID_INPUT')
    }
    const noExport = (await makeDmpExportTool(CONFIG).execute({ plan: {} }, EXEC)) as { ok: false; error: { code: string } }
    expect(noExport.error.code).toBe('INVALID_INPUT')
    const badScaffold = (await makeDmpScaffoldTool().execute({ datasets: [null] }, EXEC)) as { ok: false; error: { code: string } }
    expect(badScaffold.error.code).toBe('INVALID_INPUT')
  })
})

describe('package', () => {
  it('VERSION matches package.json and the manifest declares a bundle patch', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>
    expect(pkg['version']).toBe(VERSION)
    expect(pkg['dsh']).toEqual({ manifestVersion: 1, bundle: { patch: './cordis.patch.yml' } })
    expect(pkg['dependencies']).toEqual({})
  })
})
