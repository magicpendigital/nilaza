import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const policy = readJson("packages/agent-config/agent-execution-policy.json");
const productAgents = readJson("packages/agent-config/product-agents.json");
const codingAgents = readJson("packages/agent-config/coding-agents.json");
const workflows = readJson("packages/agent-config/feature-workflows.json");
const hasText = (value) => typeof value === "string" && value.trim().length > 0;

assert(policy.id === "nilaza_agent_execution_policy", "Agent execution policy id is invalid");
assert(hasText(policy.version), "Agent execution policy version is required");
assert(Array.isArray(policy.forbiddenDataClasses) && policy.forbiddenDataClasses.includes("provider_secret"), "Agent policy must forbid provider secrets");
assert(Array.isArray(policy.subAgentContract?.requiredHandoffFields), "Sub-agent handoff fields are required");
for (const field of ["taskId", "ownerAgent", "purpose", "writeScope", "allowedDataClasses", "validation", "stopCondition"]) {
  assert(policy.subAgentContract?.requiredHandoffFields?.includes(field), `Sub-agent handoff must require ${field}`);
}
for (const field of ["taskId", "ownerAgent", "scope", "checksRun", "residualRisk", "rollback", "managerTestPath"]) {
  assert(policy.requiredRunRecord?.includes(field), `Run record must require ${field}`);
}

const allAgents = [...productAgents, ...codingAgents];
const agentIds = new Set();
for (const agent of allAgents) {
  assert(hasText(agent.id), "Agent id is required");
  assert(!agentIds.has(agent.id), `Duplicate agent id: ${agent.id}`);
  agentIds.add(agent.id);
  assert(Array.isArray(agent.subAgents) && agent.subAgents.length > 0, `${agent.id} needs declared sub-agents`);
  const subAgentIds = new Set();
  for (const subAgent of agent.subAgents || []) {
    assert(hasText(subAgent.id), `${agent.id} has a sub-agent without an id`);
    assert(!subAgentIds.has(subAgent.id), `${agent.id} repeats sub-agent ${subAgent.id}`);
    subAgentIds.add(subAgent.id);
    assert(hasText(subAgent.purpose), `${agent.id}.${subAgent.id} needs a purpose`);
  }
}

const customerQaRoles = {
  gen_z_discovery_customer_qa_agent: {
    customerGroup: "gen_z_discovery",
    subAgents: ["first_visit_discoverability_subagent", "task_flow_clarity_subagent", "content_readability_and_output_subagent"]
  },
  emotional_reflection_customer_qa_agent: {
    customerGroup: "emotional_relationship_reflection",
    subAgents: ["reflective_tone_and_safety_subagent", "privacy_and_continuity_subagent"]
  },
  wisdom_mentor_customer_qa_agent: {
    customerGroup: "deeper_mentor_wisdom_seeker",
    subAgents: ["content_consistency_subagent", "depth_and_followup_subagent"]
  }
};
const customerQaAgentIds = Object.keys(customerQaRoles);
for (const [id, expected] of Object.entries(customerQaRoles)) {
  const agent = codingAgents.find((candidate) => candidate.id === id);
  assert(Boolean(agent), `Missing customer QA agent ${id}`);
  assert(agent?.status === "active", `${id} must be active`);
  assert(agent?.researchStatus === "synthetic_qa_hypothesis_not_validated_research", `${id} must identify its perspective as a synthetic hypothesis`);
  assert(agent?.customerGroup === expected.customerGroup, `${id} has the wrong customer group`);
  assert(agent?.readsFirst?.includes("docs/CUSTOMER_PERSPECTIVE_QA.md"), `${id} must read the customer QA playbook`);
  assert(Array.isArray(agent?.testOutcomes) && agent.testOutcomes.length >= 2 && agent.testOutcomes.every(hasText), `${id} needs observable test outcomes`);
  for (const subAgentId of expected.subAgents) {
    assert(agent?.subAgents?.some((subAgent) => subAgent.id === subAgentId), `${id} needs ${subAgentId}`);
  }
}

const customerQaWorkflow = workflows.find((workflow) => workflow.id === "customer_perspective_post_coding_qa");
assert(customerQaWorkflow?.status === "active", "Customer-perspective QA workflow must be active");
assert(customerQaWorkflow?.ownerAgent === "qa_review_agent", "Customer-perspective QA must be owned by qa_review_agent");
assert(customerQaWorkflow?.executionMode === "declared_manual_or_orchestrated_handoff", "Customer-perspective QA must not claim automatic execution");
assert(customerQaWorkflow?.trigger === "after_coding_handoff_before_manager_acceptance", "Customer-perspective QA must run after coding and before acceptance");
assert(customerQaWorkflow?.customerAgentIds?.length === customerQaAgentIds.length && customerQaAgentIds.every((id) => customerQaWorkflow.customerAgentIds.includes(id)), "Customer-perspective QA must include all three customer agents exactly once");
for (const field of policy.subAgentContract?.requiredHandoffFields || []) {
  assert(customerQaWorkflow?.requiredHandoffFields?.includes(field), `Customer-perspective QA handoff must require ${field}`);
}
for (const dataClass of ["sanitized_project_context", "synthetic_mobile_test_scenarios", "synthetic_tarot_test_scenarios", "sanitized_ui_screenshots"]) {
  assert(customerQaWorkflow?.allowedDataClasses?.includes(dataClass), `Customer-perspective QA must allow ${dataClass}`);
}
for (const dataClass of customerQaWorkflow?.allowedDataClasses || []) {
  assert(!policy.forbiddenDataClasses.includes(dataClass), `Customer-perspective QA cannot allow forbidden data class ${dataClass}`);
}
for (const channel of ["code_audit", "web_export", "native_device"]) {
  assert(customerQaWorkflow?.evidenceChannels?.includes(channel), `Customer-perspective QA must distinguish ${channel} evidence`);
}
for (const field of ["issueId", "personaAgent", "evidenceChannel", "buildOrSourceState", "viewportOrDevice", "runtimeMode", "preconditions", "steps", "expected", "actual", "findingStatus", "severity", "sanitizedEvidence", "owner", "retestStatus"]) {
  assert(customerQaWorkflow?.requiredIssueFields?.includes(field), `Customer-perspective QA issue must include ${field}`);
}
for (const status of ["reproduced", "code_supported_risk", "hypothesis"]) {
  assert(customerQaWorkflow?.findingStatuses?.includes(status), `Customer-perspective QA must distinguish ${status}`);
}
for (const level of ["P0", "P1", "P2", "P3"]) {
  assert(customerQaWorkflow?.severityLevels?.includes(level), `Customer-perspective QA must define ${level}`);
}
for (const state of ["not_started", "pass", "fail", "blocked"]) {
  assert(customerQaWorkflow?.retestStates?.includes(state), `Customer-perspective QA must define retest state ${state}`);
}
const tarotPilot = customerQaWorkflow?.pilotScenarioSets?.find((set) => set.feature === "tarot");
assert(tarotPilot?.scenarioDocument === "docs/CUSTOMER_PERSPECTIVE_QA.md", "Customer-perspective QA must locate its Tarot pilot scenarios");
assert(tarotPilot?.regressionIds?.includes("tarot_second_reading_reset_0_of_n_no_stale_result"), "Tarot pilot QA must check second-reading reset");
for (const step of ["coding_owner_handoff_with_build_source_mode_and_changed_flow", "three_customer_agents_review_with_separate_evidence_channels", "customer_agents_retest_on_new_build_and_record_residual_risk", "manager_reviews_evidence_before_acceptance"]) {
  assert(customerQaWorkflow?.steps?.includes(step), `Customer-perspective QA is missing ${step}`);
}
assert(Array.isArray(customerQaWorkflow?.qualityGate) && customerQaWorkflow.qualityGate.length >= 4, "Customer-perspective QA needs quality gates");
assert(Array.isArray(customerQaWorkflow?.blockedIf) && customerQaWorkflow.blockedIf.length >= 3, "Customer-perspective QA needs explicit stop conditions");

const parallelDelivery = workflows.find((workflow) => workflow.id === "parallel_feature_delivery");
assert(Boolean(parallelDelivery), "Feature workflows must define parallel_feature_delivery");
for (const lane of parallelDelivery?.lanes || []) {
  assert(agentIds.has(lane.ownerAgent), `${lane.id} owner ${lane.ownerAgent} is not an agent`);
  assert(Array.isArray(lane.writeScope) && lane.writeScope.length > 0, `${lane.id} needs a write scope`);
  assert(Array.isArray(lane.qualityGate) && lane.qualityGate.length > 0, `${lane.id} needs quality gates`);
}
assert(parallelDelivery?.lanes?.some((lane) => lane.id === "backend_supabase_lane"), "Parallel delivery needs a backend_supabase_lane");
assert(parallelDelivery?.lanes?.find((lane) => lane.id === "mobile_experience_lane")?.qualityGate?.includes("customer_perspective_post_coding_qa"), "Mobile delivery must include customer-perspective QA before acceptance");

const planGate = workflows.find((workflow) => workflow.id === "plan_qc_gate");
assert(planGate?.status === "active", "Plan QC gate must be active");
for (const lane of parallelDelivery?.lanes || []) {
  assert(planGate?.requiredBefore?.includes(lane.id), `Plan QC gate must run before ${lane.id}`);
}
for (const gate of [
  "agent_run_record_declared",
  "write_scope_declared",
  "contract_source_declared_when_applicable",
  "feature_preflight_passed_before_mutation",
  "skill_and_knowledge_freshness_reviewed",
  "security_stop_conditions_reviewed"
]) {
  assert(planGate?.qualityGate?.includes(gate), `Plan QC gate must include ${gate}`);
}

if (errors.length) {
  console.error("Agent governance validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Agent governance validation passed (${allAgents.length} agents, ${parallelDelivery?.lanes?.length || 0} delivery lanes).`);
