import { readFileSync, existsSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only planning checks. This does not test the application or accept a release.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/^\uFEFF/, '');
const json = (path) => JSON.parse(read(path));
const backlog = json('docs/mvp-remediation/2026-10-01/backlog.json');
const roles = json('packages/agent-config/coding-agents.json');
const workflows = json('packages/agent-config/feature-workflows.json');
const governance = json('packages/agent-config/agent-execution-policy.json');
const scripts = json('package.json').scripts;
const mobileScripts = json('apps/mobile/package.json').scripts;
const roleIds = new Set(roles.map((role) => role.id));
const lanes = new Map(workflows.flatMap((workflow) => workflow.lanes ?? []).map((lane) => [lane.id, lane]));
const errors = [];
const require = (condition, message) => { if (!condition) errors.push(message); };
const textValue = (value) => typeof value === 'string' && value.trim().length > 0;

require(backlog.status === 'planning_only_not_implemented', 'Backlog must remain planning-only.');
require(backlog.schemaVersion === 'nilaza-mvp-remediation-backlog-v1', 'Unexpected backlog schema.');
require(backlog.handoffPolicy.newPersistentAgentRequired === false, 'Persistent new Agent is not required by this plan.');
require(backlog.handoffPolicy.externalActionsAuthorized === false, 'Planning must not authorize external actions.');
require(existsSync(resolve(root, backlog.sourceReview)), 'Dated source review is missing.');

const stages = new Set(backlog.handoffPolicy.coordinationStages);
const tasks = backlog.tasks;
require(Array.isArray(tasks) && tasks.length === 26, 'Expected 26 task cards.');
const taskIds = new Set(tasks.map((task) => task.taskId));
require(taskIds.size === tasks.length, 'Duplicate task IDs.');
for (let i = 0; i < 26; i += 1) require(taskIds.has(`R${String(i).padStart(2, '0')}`), `Missing R${String(i).padStart(2, '0')}.`);

let edgeCount = 0;
for (const task of tasks) {
  const id = task.taskId;
  const effective = { ...backlog.handoffPolicy, ...task };
  for (const field of governance.subAgentContract.requiredHandoffFields) {
    const value = effective[field];
    require(Array.isArray(value) ? value.length > 0 : textValue(value), `${id}: missing effective ${field}.`);
  }
  require(roleIds.has(task.ownerAgent), `${id}: owner is not a configured role.`);
  for (const role of task.integrationPartners ?? []) require(roleIds.has(role), `${id}: unknown integration role ${role}.`);
  require(lanes.has(task.lane) || stages.has(task.lane), `${id}: undeclared lane/stage ${task.lane}.`);
  if (lanes.has(task.lane)) require(lanes.get(task.lane).ownerAgent === task.ownerAgent, `${id}: canonical lane owner mismatch.`);
  require(Number.isInteger(task.phase) && task.phase >= 0 && task.phase <= 5, `${id}: invalid phase.`);
  require(Array.isArray(task.acceptance) && task.acceptance.length >= 3 && task.acceptance.every(textValue), `${id}: acceptance is incomplete.`);
  require(textValue(task.managerTestPath) && textValue(effective.rollback), `${id}: missing manager path/rollback.`);
  require(Array.isArray(task.validation) && task.validation.length > 0 && task.validation.every(textValue), `${id}: validation is missing.`);
  require(Array.isArray(task.externalGates) && textValue(task.startMode) && textValue(task.releaseScope), `${id}: missing start/release/gate declaration.`);
  for (const dataClass of effective.allowedDataClasses ?? []) require(!governance.forbiddenDataClasses.includes(dataClass), `${id}: forbidden data class ${dataClass}.`);
  for (const path of task.writeScope ?? []) {
    const target = resolve(root, path);
    const inside = relative(root, target);
    require(textValue(path) && !isAbsolute(path) && !/^[A-Za-z]:/.test(path) && inside !== '' && !inside.startsWith('..') && !isAbsolute(inside), `${id}: unsafe write scope ${path}.`);
  }
  for (const dependency of task.startDependencies ?? []) require((task.dependencies ?? []).includes(dependency), `${id}: start dependency ${dependency} is not a completion gate.`);
  for (const dependency of task.dependencies ?? []) {
    edgeCount += 1;
    require(taskIds.has(dependency) && dependency !== id, `${id}: invalid dependency ${dependency}.`);
    const parent = tasks.find((candidate) => candidate.taskId === dependency);
    if (parent) require(parent.phase <= task.phase, `${id}: dependency ${dependency} is in a later phase.`);
  }
  for (const command of task.validation ?? []) {
    const rootCommand = command.match(/^npm run ([\w:-]+)/);
    if (rootCommand) require(Object.hasOwn(scripts, rootCommand[1]), `${id}: missing npm script ${rootCommand[1]}.`);
    const mobileCommand = command.match(/^npm --workspace apps\/mobile (?:run )?([\w:-]+)/);
    if (mobileCommand) require(Object.hasOwn(mobileScripts, mobileCommand[1]), `${id}: missing mobile script ${mobileCommand[1]}.`);
  }
}

const visited = new Set();
const stack = new Set();
const visit = (id) => {
  if (stack.has(id)) { errors.push(`Dependency cycle at ${id}.`); return; }
  if (visited.has(id)) return;
  stack.add(id);
  for (const dependency of tasks.find((task) => task.taskId === id)?.dependencies ?? []) if (taskIds.has(dependency)) visit(dependency);
  stack.delete(id);
  visited.add(id);
};
for (const id of taskIds) visit(id);

const docPath = 'docs/MVP_REMEDIATION_PLAN_2026-10-01.vi.md';
const doc = read(docPath);
let localLinks = 0;
for (const match of doc.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  const target = match[1].replace(/^<|>$/g, '').split('#')[0];
  if (!target || /^(?:https?:|codex:|mailto:)/i.test(target)) continue;
  localLinks += 1;
  require(existsSync(resolve(dirname(resolve(root, docPath)), target)), `Missing local document link ${target}.`);
}
require(doc.includes('RC native Android/iOS đạt'), 'G1 must require both native platforms.');
require(doc.includes('mục tiêu đề xuất'), 'Targets must not be reported as measurements.');
require(doc.includes('kế hoạch triển khai; chưa thực hiện'), 'Implementation status is not explicit.');

if (errors.length) {
  for (const error of errors) process.stderr.write(`FAIL: ${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`PASS: ${tasks.length} planning cards, ${roleIds.size} configured roles, ${edgeCount} dependencies, acyclic graph, ${localLinks} local links; handoffs, existing scripts and platform gates checked.\n`);
  process.stdout.write('Application tests, runtime configuration, database gates and native acceptance were not executed by this validator.\n');
}
