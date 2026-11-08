/**
 * Scaffolding, retention parsing and consistency checks.
 * @module test/plan.spec
 */

import { describe, expect, it } from 'vitest'
import { checkPlan, retentionYearsOf, scaffoldPlan, type DmpPlan } from '../src/plan.ts'

/** A fully filled plan with one de-identified dataset. */
function completePlan(): DmpPlan {
  return {
    version: 1,
    project: { title: 'Fixture project', funder: 'Synthetic Fund', grantId: 'G-1', institution: 'Example University', contact: 'data@example.org' },
    datasets: [
      { name: 'survey.csv', type: 'tabular', format: 'CSV', volume: '2 GB', containsPersonalData: false, repository: 'Zenodo', license: 'CC BY 4.0', persistentId: '10.5281/zenodo.1' },
    ],
    sections: {
      dataDescription: 'One tabular survey dataset with 1,200 responses and derived aggregates.',
      collection: 'Online survey with a sampling frame drawn from public registers.',
      documentation: 'A README plus a codebook with variable definitions and value labels.',
      storage: 'Institutional encrypted storage with nightly backup and monthly restore tests.',
      security: 'Role-based access, encryption at rest and in transit, no personal devices.',
      sharing: 'De-identified data will be shared openly under CC BY 4.0 in Zenodo.',
      retention: 'Kept for 10 years after publication, then destroyed.',
      roles: 'The data steward maintains storage; the PI approves access.',
      legal: 'Ethics approval IRB-123; consent covers open sharing of de-identified data.',
      costs: 'Repository fees and 0.1 FTE curation are covered by the grant.',
    },
  }
}

describe('scaffold', () => {
  it('returns ten prompt-filled sections without inventing content', () => {
    const plan = scaffoldPlan({ title: 'New project' })
    expect(Object.keys(plan.sections)).toHaveLength(10)
    expect(plan.sections.storage).toContain('backup')
    expect(plan.project.title).toBe('New project')
  })
})

describe('retention', () => {
  it('parses years and months', () => {
    expect(retentionYearsOf('10 years after publication')).toBe(10)
    expect(retentionYearsOf('保留 5 年')).toBe(5)
    expect(retentionYearsOf('18 months')).toBe(1.5)
    expect(retentionYearsOf('forever')).toBeUndefined()
  })
})

describe('check', () => {
  it('accepts a complete plan', () => {
    const result = checkPlan(completePlan())
    expect(result.complete).toBe(true)
    expect(result.coverage).toBe(1)
    expect(result.retentionYears).toBe(10)
    expect(result.issues.filter(issue => issue.severity === 'error')).toEqual([])
  })

  it('flags missing sections, retention and backup', () => {
    const plan = completePlan()
    const partial: DmpPlan = {
      ...plan,
      sections: { ...plan.sections, sharing: '', retention: 'Kept for 2 years.', storage: 'Institutional encrypted storage.' },
    }
    const result = checkPlan(partial)
    expect(result.complete).toBe(false)
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['missing_sharing', 'retention_below_minimum', 'storage_without_backup']))
  })

  it('does not treat scaffold prompts as filled sections', () => {
    const scaffolded = scaffoldPlan({
      title: 'Prompt-only project',
      contact: 'data@example.org',
      datasets: [{ name: 'survey.csv', type: 'tabular', repository: 'Zenodo', license: 'CC BY 4.0', persistentId: '10.1/x' }],
    })
    const result = checkPlan(scaffolded)
    expect(result.complete).toBe(false)
    expect(result.coverage).toBe(0)
    expect(result.issues.map(issue => issue.code)).toEqual(
      expect.arrayContaining(['missing_dataDescription', 'missing_sharing', 'missing_retention']),
    )
  })

  it('does not read a journal publication as open sharing', () => {
    const plan = completePlan()
    const personal: DmpPlan = {
      ...plan,
      datasets: [{ ...plan.datasets![0]!, containsPersonalData: true }],
      sections: { ...plan.sections, sharing: 'Publication in a journal after the project ends.' },
    }
    expect(checkPlan(personal).issues.map(issue => issue.code)).not.toContain('open_sharing_of_personal_data')
  })

  it('treats empty dataset fields and contact as missing', () => {
    const plan = completePlan()
    const messy: DmpPlan = {
      ...plan,
      project: { title: 'No contact', contact: '   ' },
      datasets: [{ name: 'raw', type: 'text', repository: '', license: ' ', persistentId: '' }],
    }
    const codes = checkPlan(messy).issues.map(issue => issue.code)
    expect(codes).toEqual(expect.arrayContaining(['dataset_without_repository', 'dataset_without_license', 'dataset_without_persistent_id', 'no_contact']))
  })

  it('refuses open sharing of personal data without de-identification', () => {
    const plan = completePlan()
    const withPersonal: DmpPlan = {
      ...plan,
      datasets: [{ ...plan.datasets![0]!, containsPersonalData: true }],
      sections: { ...plan.sections, sharing: 'The data will be shared openly with everyone.' },
    }
    const result = checkPlan(withPersonal)
    expect(result.issues.some(issue => issue.code === 'open_sharing_of_personal_data' && issue.severity === 'error')).toBe(true)
  })

  it('flags datasets without repository or license and a missing contact', () => {
    const plan = completePlan()
    const messy: DmpPlan = {
      ...plan,
      project: { title: 'No contact' },
      datasets: [{ name: 'raw', type: 'text' }],
    }
    const codes = checkPlan(messy).issues.map(issue => issue.code)
    expect(codes).toEqual(expect.arrayContaining(['dataset_without_repository', 'dataset_without_license', 'no_contact']))
  })
})
