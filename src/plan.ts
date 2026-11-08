/**
 * Data-management-plan structure, scaffolding and checks.
 *
 * The plan is a plain JSON document. Checks are about completeness, internal
 * consistency and explicit gaps — not about compliance with a specific funder's
 * current template, which changes and must be verified against the call text.
 *
 * @module dsh-dmp/plan
 */

/** Dataset entry in the plan. */
export interface DatasetEntry {
  readonly name: string
  /** e.g. "tabular", "interview transcripts", "imaging". */
  readonly type: string
  readonly format?: string
  readonly volume?: string
  readonly containsPersonalData?: boolean
  readonly repository?: string
  readonly license?: string
  readonly persistentId?: string
}

/** The plan sections. */
export interface PlanSections {
  /** What data will be created, with types/formats/volumes. */
  readonly dataDescription?: string
  /** How data will be collected or generated. */
  readonly collection?: string
  /** Metadata and documentation standards. */
  readonly documentation?: string
  /** Where data will be stored during the project (and backup). */
  readonly storage?: string
  /** Access control and security measures. */
  readonly security?: string
  /** How and when data will be shared or published. */
  readonly sharing?: string
  /** Retention period and preservation plan after the project. */
  readonly retention?: string
  /** Who is responsible for which data-management task. */
  readonly roles?: string
  /** Legal/ethics basis, consent, DPA/GDPR-equivalent. */
  readonly legal?: string
  /** Costs and how they are covered. */
  readonly costs?: string
}

/** The plan. */
export interface DmpPlan {
  readonly version: 1
  readonly project: {
    readonly title: string
    readonly funder?: string
    readonly grantId?: string
    readonly institution?: string
    readonly contact?: string
  }
  readonly datasets?: readonly DatasetEntry[]
  readonly sections: PlanSections
}

/** One check result. */
export interface DmpIssue {
  readonly code: string
  readonly severity: 'info' | 'warning' | 'error'
  readonly detail: string
  readonly suggestion: string
}

/** Check result. */
export interface DmpCheckResult {
  readonly complete: boolean
  readonly coverage: number
  readonly issues: readonly DmpIssue[]
  readonly retentionYears?: number
}

/** Required sections. */
export const REQUIRED_SECTIONS: ReadonlyArray<{ key: keyof PlanSections; label: string }> = [
  { key: 'dataDescription', label: 'Data description' },
  { key: 'collection', label: 'Collection / generation' },
  { key: 'documentation', label: 'Documentation and metadata' },
  { key: 'storage', label: 'Storage and backup' },
  { key: 'security', label: 'Security and access control' },
  { key: 'sharing', label: 'Sharing and publication' },
  { key: 'retention', label: 'Retention and preservation' },
  { key: 'roles', label: 'Roles and responsibilities' },
  { key: 'legal', label: 'Legal and ethical basis' },
  { key: 'costs', label: 'Costs' },
]

/** Section prompts for scaffolding. */
export const SECTION_PROMPTS: Readonly<Record<keyof PlanSections, string>> = {
  dataDescription: 'List each dataset: what it contains, type (tabular, text, imaging, code), format, volume, and whether it contains personal data.',
  collection: 'How will each dataset be collected or generated? Which instruments, sources and sampling frame?',
  documentation: 'Which metadata standard or README will accompany each dataset? Which controlled vocabularies and variable definitions?',
  storage: 'Where will data live during the project (institutional storage, encrypted cloud, project server)? What is the backup schedule and who verifies restores?',
  security: 'Who may access what? Encryption at rest/in transit, key management, access reviews, device rules for personal data.',
  sharing: 'Which datasets will be shared, when, under what license and access route (open, restricted, controlled)? Which repository?',
  retention: 'How long after the project will data be kept, where, and what will be destroyed when? Which funder/institutional minimum applies?',
  roles: 'Who is responsible for storage, backup, documentation, sharing and destruction? Name a data steward and a contact.',
  legal: 'Which legal basis, consent wording, ethics approval and data-processing agreement apply? Any transfer outside the institution?',
  costs: 'What do storage, curation, repository fees and personnel cost, and where are these costs covered?',
}

/** Parse a retention period in years from free text. */
export function retentionYearsOf(text: string | undefined): number | undefined {
  if (text === undefined) return undefined
  const years = /(\d{1,2})\s*(?:year|years|yr|yrs|年)/iu.exec(text)
  if (years !== null) return Number(years[1])
  const months = /(\d{1,2})\s*(?:month|months|月)/iu.exec(text)
  if (months !== null) return Number((Number(months[1]) / 12).toFixed(2))
  return undefined
}

/**
 * True when a section has real content. A scaffold prompt is a placeholder,
 * not an answer: treating it as filled would let `dmp_scaffold` satisfy its own
 * completeness check.
 */
function filledSection(key: keyof PlanSections, value: string | undefined): boolean {
  if (value === undefined) return false
  const trimmed = value.trim()
  return trimmed.length >= 10 && trimmed !== SECTION_PROMPTS[key]
}

/** True for a non-empty string (empty strings do not satisfy a field). */
function hasText(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ''
}

/**
 * Check a plan for completeness and internal consistency.
 * @param plan - the plan.
 * @param options - minimum retention years (default 5; verify your funder).
 * @returns coverage, issues and parsed retention.
 */
export function checkPlan(plan: DmpPlan, options: { minRetentionYears?: number } = {}): DmpCheckResult {
  const minRetention = options.minRetentionYears ?? 5
  const issues: DmpIssue[] = []
  let present = 0
  for (const section of REQUIRED_SECTIONS) {
    if (filledSection(section.key, plan.sections[section.key])) present += 1
    else {
      issues.push({
        code: `missing_${section.key}`,
        severity: section.key === 'dataDescription' || section.key === 'sharing' || section.key === 'retention' ? 'error' : 'warning',
        detail: `section "${section.label}" is missing or too short`,
        suggestion: SECTION_PROMPTS[section.key],
      })
    }
  }
  const coverage = Number((present / REQUIRED_SECTIONS.length).toFixed(4))
  const datasets = plan.datasets ?? []
  if (datasets.length === 0) {
    issues.push({ code: 'no_datasets', severity: 'error', detail: 'the plan lists no datasets', suggestion: 'add at least one dataset with its type, format and volume' })
  }
  const personal = datasets.filter(dataset => dataset.containsPersonalData === true)
  if (personal.length > 0) {
    if (!filledSection('security', plan.sections.security)) issues.push({ code: 'personal_data_without_security', severity: 'error', detail: 'personal data is listed but no security section is filled', suggestion: SECTION_PROMPTS.security })
    if (!filledSection('legal', plan.sections.legal)) issues.push({ code: 'personal_data_without_legal', severity: 'error', detail: 'personal data is listed but no legal/ethics basis is given', suggestion: SECTION_PROMPTS.legal })
    const sharing = (plan.sections.sharing ?? '').toLowerCase()
    // `public` must be a word: "publication in a journal" is not open sharing.
    if (/\bopen(?:ly)?\b|\bpublic(?:ly)?\b|公开/iu.test(sharing) && !/de-identif|anonym|pseudonym|aggregat|access control|restricted|受控|去标识|匿名/iu.test(sharing)) {
      issues.push({ code: 'open_sharing_of_personal_data', severity: 'error', detail: 'the plan proposes open sharing but lists personal data without de-identification or a restricted-access route', suggestion: 'share only de-identified data openly; use a controlled-access repository for personal data' })
    }
  }
  for (const dataset of datasets) {
    if (!hasText(dataset.repository) && !/not shared|restricted|不可共享|不共享/iu.test(plan.sections.sharing ?? '')) {
      issues.push({ code: 'dataset_without_repository', severity: 'warning', detail: `dataset "${dataset.name}" has no repository`, suggestion: 'name the repository (or state why the dataset cannot be shared)' })
    }
    if (!hasText(dataset.persistentId)) issues.push({ code: 'dataset_without_persistent_id', severity: 'info', detail: `dataset "${dataset.name}" has no persistent identifier (DOI)`, suggestion: 'mint a DOI when the dataset is published' })
    if (!hasText(dataset.license)) issues.push({ code: 'dataset_without_license', severity: 'warning', detail: `dataset "${dataset.name}" has no license`, suggestion: 'state a license (e.g. CC BY 4.0) or the access conditions' })
  }
  const retentionYears = retentionYearsOf(plan.sections.retention)
  if (filledSection('retention', plan.sections.retention) && retentionYears === undefined) {
    issues.push({ code: 'retention_unparseable', severity: 'warning', detail: 'no retention period in years could be parsed from the retention section', suggestion: 'state an explicit number of years (e.g. "10 years after publication")' })
  } else if (retentionYears !== undefined && retentionYears < minRetention) {
    issues.push({ code: 'retention_below_minimum', severity: 'warning', detail: `the stated retention (${retentionYears} years) is below the configured minimum (${minRetention} years)`, suggestion: `confirm the funder/institution minimum; the default here is ${minRetention} years and must be verified against the call` })
  }
  if (filledSection('storage', plan.sections.storage) && !/backup|备份|replicat|snapshot|version/iu.test(plan.sections.storage ?? '')) {
    issues.push({ code: 'storage_without_backup', severity: 'warning', detail: 'the storage section does not mention backup or versioning', suggestion: 'state the backup schedule and who verifies restores' })
  }
  if (!filledSection('costs', plan.sections.costs)) issues.push({ code: 'no_costs', severity: 'info', detail: 'no cost section', suggestion: SECTION_PROMPTS.costs })
  if (!hasText(plan.project.contact)) issues.push({ code: 'no_contact', severity: 'warning', detail: 'no data-management contact is named', suggestion: 'name a data steward or contact person' })
  return {
    complete: !issues.some(issue => issue.severity === 'error'),
    coverage,
    issues,
    ...(retentionYears === undefined ? {} : { retentionYears }),
  }
}

/**
 * Build a scaffold plan with prompts in each empty section.
 * @param input - project identity.
 * @returns the plan (sections contain prompts, not fabricated content).
 */
export function scaffoldPlan(input: { title?: string; funder?: string; grantId?: string; institution?: string; contact?: string; datasets?: readonly DatasetEntry[] } = {}): DmpPlan {
  return {
    version: 1,
    project: {
      title: input.title ?? '[project title]',
      ...(input.funder === undefined ? {} : { funder: input.funder }),
      ...(input.grantId === undefined ? {} : { grantId: input.grantId }),
      ...(input.institution === undefined ? {} : { institution: input.institution }),
      ...(input.contact === undefined ? {} : { contact: input.contact }),
    },
    ...(input.datasets === undefined ? {} : { datasets: input.datasets }),
    sections: {
      dataDescription: SECTION_PROMPTS.dataDescription,
      collection: SECTION_PROMPTS.collection,
      documentation: SECTION_PROMPTS.documentation,
      storage: SECTION_PROMPTS.storage,
      security: SECTION_PROMPTS.security,
      sharing: SECTION_PROMPTS.sharing,
      retention: SECTION_PROMPTS.retention,
      roles: SECTION_PROMPTS.roles,
      legal: SECTION_PROMPTS.legal,
      costs: SECTION_PROMPTS.costs,
    },
  }
}
