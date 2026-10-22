# Nilaza Agent Runbook

Last updated: 2026-09-27

## What this controls

`packages/agent-config/agent-execution-policy.json` is Nilaza's reviewed policy for product and coding agents. It is a delivery guardrail, not a hidden autonomous runtime and not permission to use credentials, deploy, publish, repair a database, or make irreversible changes.

Every meaningful agent handoff must state:

```text
taskId:
ownerAgent:
purpose:
writeScope:
allowedDataClasses:
validation:
stopCondition:
```

Every completed run must additionally record checks run, residual risk, rollback path and a manager test path. The owner approves only actions already in scope; production deployment, publishing, migration repair and destructive actions always need an explicit manager decision.

## Safe delegation rules

- One owner agent owns one declared write scope. Overlapping scopes are resolved before edits, not by racing changes.
- Sub-agents receive only sanitized project context by default. Raw chat, journals, birth data, face uploads, service-role keys and provider secrets are prohibited.
- A sub-agent stops and returns control if it needs a broader scope, credentials, a production action, or private user data.
- Configured agent roles are planning and delivery roles, not mobile-app personas. Runtime AI Council is governed by its separate API contract.

## Manager-friendly workflow

1. Ask for a change in plain language.
2. For a new feature, the owner records the plan, impact map, current-source and affected-skill decisions, security risks, rollback, and manager test path under `docs/PLAN_QC_PROTOCOL.md`. Run `npm run feature:preflight -- --record docs/feature-plans/<task>.json` before implementation commands or edits. For supported development/generation commands, use `npm run feature:run -- --record docs/feature-plans/<task>.json --script mobile:dev` (replace the script name with the allowlisted command). This repeats the gate immediately before the command. An unresolved high-risk issue blocks the feature until mitigated and the gate passes again.
3. The assigned lane declares exactly which folders it may change and the checks it will run.
4. CI reports the mobile or Admin quality result after the branch is pushed. A red check means do not accept the build yet; a green check means the automated gates passed, not that a human has approved release.
5. Review the plain-language handoff, test the stated path, then decide whether to deploy or publish.

After feature validation, the owner records reusable discoveries in affected repository skills or explains why each remains current. A passing skill hash/install check establishes provenance and drift state, not that technical claims are up to date. Verify volatile APIs and security behavior with current official primary sources and the versions actually used by Nilaza.

The local runner covers only its allowlisted commands. It blocks a launch when dirty files in the command's known app, shared-package, or generator input areas lack planned scope or current source evidence. Its static entry-script import review cannot resolve every dynamic runtime dependency. A direct shell or workspace command can bypass it, and PR CI checks committed changes rather than proving local command order. Do not describe the runner as a universal execution or security sandbox.

Run `npm run validate:governance` whenever agent config or delivery workflow changes.
Run `npm run skills:validate` whenever a repository skill or its manifest changes. It is a dependency-free source/manifest gate for this Windows environment; run Skill Creator's `quick_validate.py` as an additional check whenever its Python runtime includes PyYAML.

## Customer-perspective QA after coding

`packages/agent-config/coding-agents.json` declares three synthetic customer QA roles: `gen_z_discovery_customer_qa_agent`, `emotional_reflection_customer_qa_agent`, and `wisdom_mentor_customer_qa_agent`. Each has focused sub-agent roles. They represent behavior hypotheses from the documented target groups, not interviewed or validated customers. These are delivery roles, separate from the app's runtime product agents.

When a coding owner hands off any changed customer-facing mobile flow, `qa_review_agent` uses `customer_perspective_post_coding_qa` in `packages/agent-config/feature-workflows.json` and the playbook in `docs/CUSTOMER_PERSPECTIVE_QA.md`. Tarot is the first pilot scenario set, not the limit of these roles. The workflow declares a required checkpoint; configuration alone does not schedule or launch an agent. The QA owner must make a real handoff with the seven required fields above, assign only sanitized or fictional inputs, and state an exact report write scope. Child sub-agents are invoked only when that task's parent explicitly permits them.

Reports label code audit, web export, and native-device evidence separately. They include source or build state, runtime mode (local fallback or authenticated backend), viewport or device, reproducible steps, severity, sanitized evidence, and retest status. Unrun channels stay `unverified`; a browser review never proves native behavior. The QA owner consolidates duplicate findings and returns fixes to the coding owner for a separately scoped implementation stage. P0 and P1 issues block manager acceptance until fixed and retested. Customer QA roles do not receive private app data or authority to change production state.


## Release evidence workflow - 2026-10-04

Route release/environment preparation to docs/release/RELEASE_RUNBOOK.md and the exact-version owner packet. Use scripts/release-evidence.mjs for read-only evidence verification after appropriate existing checks. Preserve the migration-ledger stop condition, dirty input review and feature preflight. Production credentials, target mapping, remote protection and release execution are separate owner-approved gates. Missing or unrun evidence is BLOCKED, not PASS.
