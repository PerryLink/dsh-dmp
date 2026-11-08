# dsh-dmp

**一份说得清数据放在哪、谁能动、项目结束后怎么办的数据管理计划。**

*十节脚手架 + 提示语、完整性与一致性检查（个人数据 vs 公开共享、保存期下限、备份、仓库/许可/DOI），以及可直接粘贴进基金表格的 Markdown 导出。*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24.9-brightgreen.svg)]()

[English](README.md) · 简体中文

---

## 它做什么

- **`dmp_scaffold`** — returns the ten sections (data description, collection, documentation, storage/backup, security, sharing, retention, roles, legal basis, costs) filled with **prompts**, not invented project content, plus optional dataset entries.
- **`dmp_check`** — completeness (10 sections), dataset coverage (repository, licence, DOI), personal-data consistency (security and legal basis required; open sharing without de-identification is an error), retention below the configured minimum, storage without backup, missing contact.
- **`dmp_export`** — Markdown (identity, dataset table, sections, issue table) + JSON check + SARIF 2.1.0.

## 它做什么 not do

- **No funder-template certification.** Funder templates change; the checks are completeness/consistency checks. Verify the current call text.
- **No legal advice.** "Personal data" and "open sharing" are judged by flags in the plan, not by a legal analysis.
- **No repository submission.** It writes Markdown; you submit.
- **No network, no file writes.** Pure local documents.

## 章节

| Key | Required content |
|---|---|
| `dataDescription` | datasets, types, formats, volumes, personal-data flag |
| `collection` | collection/generation process |
| `documentation` | metadata standard, codebook, README |
| `storage` | storage location, backup, restore tests |
| `security` | access control, encryption, devices |
| `sharing` | what is shared, when, licence, repository, access route |
| `retention` | explicit years and destruction plan |
| `roles` | data steward, responsibilities, contact |
| `legal` | ethics approval, consent, DPA, transfers |
| `costs` | storage/curation costs and coverage |

## 检查项

| Code | Severity | Meaning |
|---|---|---|
| `missing_*` | warning/error | a required section is empty or too short |
| `no_datasets` | error | no dataset listed |
| `personal_data_without_security` / `_without_legal` | error | personal data flagged, section missing |
| `open_sharing_of_personal_data` | error | open sharing proposed without de-identification/restricted access |
| `retention_below_minimum` | warning | parsed retention < configured minimum (default 5 years — verify) |
| `retention_unparseable` | warning | no explicit period found |
| `storage_without_backup` | warning | storage section never mentions backup/versioning |
| `dataset_without_repository` / `_without_license` | warning | dataset lacks repository or licence |
| `dataset_without_persistent_id` | info | no DOI |
| `no_contact` | warning | no data steward/contact |

## 工具

### `dmp_scaffold`

`{ title?, funder?, grantId?, institution?, contact?, datasets? }` → `{ ok, plan }`.

### `dmp_check`

`{ plan, minRetentionYears? }` → `{ ok, check: { complete, coverage, issues, retentionYears? } }`.

### `dmp_export`

`{ plan, minRetentionYears? }` → `{ ok, markdown, check, sarif }`.

## 兼容性与安装

| | |
|---|---|
| DeepSeek Harness | **`dsh-v0.2.1-rc.5`** (verified 2026-11-08); peer `>=0.2.1-0 <0.3.0 \|\| >=0.2.2-0 <0.3.0` |
| Node | `^22.19.0 \|\| >=24.9.0` (tested `24.22.1`), ESM only |
| Peers | `@perrylink/dsh-research-core ^0.1.0`, `@deepseek-ai/cordis ^4.0.5-alpha.1`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/schemastery ^3.18.5-alpha.1` |
| Runtime dependencies | **zero** |

```sh
dsh plugin --profile <name> add @perrylink/dsh-research-core dsh-dmp
dsh --profile <name> --dump-config | grep dsh-dmp
```

## 配置

| Key | Default | Meaning |
|---|---|---|
| `enabled` | `true` | `false` mounts nothing |
| `minRetentionYears` | `5` | scaffold default for the retention check — **not** a funder rule |

## 安全边界

- No network, no file access: the plan is an in-memory JSON document.
- No secrets or personal data are read or written by the plugin.

## 评测

**14 tests**: scaffold (10 prompt sections), retention parsing (years, Chinese 年, months, unparseable), complete plan accepted, missing sections/retention/backup flagged, open-sharing-of-personal-data conflict, a journal publication not mistaken for open sharing, prompt-only scaffolds not counted as complete, empty dataset fields/contact treated as missing, malformed-plan and retention-override guards, tool schemas, scaffold→check→export end to end, failure branches, package contract.

No benchmark is claimed: these are structural checks on a JSON document, pinned by fixtures.

## 已知限制（v0.1）

- The checks trust the plan's own flags (`containsPersonalData`, sharing wording); they cannot verify reality.
- Only English/Chinese cue words for open sharing and de-identification.
- No funder-specific templates, no export to DOCX/PDF.
- Retention minimum is a scaffold default, not a funder rule.
- Scaffold prompts are placeholders: `dmp_check` treats them as missing until replaced with project text.

## 许可

Apache-2.0. No third-party runtime code.
