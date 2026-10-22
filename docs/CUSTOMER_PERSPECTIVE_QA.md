# Customer-perspective QA playbook

Last updated: 2026-09-28

## Tóm tắt cho người quản lý

- Có ba vai kiểm thử giả định cho **toàn bộ ứng dụng mobile**: người mới khám phá, người tìm sự phản chiếu về cảm xúc/quan hệ, và người muốn tìm hiểu sâu. Đây là góc nhìn để thử sản phẩm, chưa phải chân dung đã được nghiên cứu với khách hàng thật.
- Sau khi coding xong, QA owner phải giao việc cụ thể rồi mới chạy các vai này. Cấu hình trong repo không tự khởi chạy Agent và không tự sửa ứng dụng.
- Mỗi lỗi cần cách tái hiện, mức độ P0–P3, bằng chứng đã ẩn dữ liệu riêng tư và kết quả kiểm tra lại. Báo cáo phải tách kiểm tra mã nguồn, web và thiết bị thật; kênh chưa chạy phải ghi `unverified`.
- Riêng nhiệm vụ Tarot ngày 2026-09-28 dừng ở bản audit và phương án sửa để chủ sản phẩm xem trước. Lỗi ứng dụng và kiểm thử lại thuộc giai đoạn tiếp theo.

## Purpose and status

This is an internal delivery test playbook for the three Nilaza target-user groups in `AGENTS.md` and `docs/FEATURE_PRD.md`. The roles cover any changed mobile flow: onboarding, Home, Explore, Chat, Tarot, Astrology, Journal, Profile, and later customer-facing features where applicable. They are **synthetic behavior hypotheses**. They help test a design from different points of view; they are not evidence of customer interviews, demographics, usability research, or market validation. Their config is in `packages/agent-config/coding-agents.json`; the checkpoint is `customer_perspective_post_coding_qa` in `packages/agent-config/feature-workflows.json`.

The QA checkpoint runs **after a coding handoff and before manager acceptance** when the assigned owner or orchestrator invokes it. The JSON declaration itself does not run tests, monitor commits, create sub-agents, or fix code. The QA owner is `qa_review_agent`. A coding owner remains responsible for implementation and for a new validation handoff after a fix. Production release remains a separate decision.

## Three customer lenses

| Declared agent | Synthetic customer question | Focused sub-agents | Observable outcome |
| --- | --- | --- | --- |
| `gen_z_discovery_customer_qa_agent` | “I am new to this feature. Where do I start, what happens next, and can I read or share the outcome comfortably on my phone?” | First-visit discoverability; task flow clarity; content readability and output | Supported entry points, clear choices and progress, readable content, complete and private saved/shared output where present. |
| `emotional_reflection_customer_qa_agent` | “Does this guidance feel supportive while leaving the decision with me, and do I understand what happens to what I share or save?” | Reflective tone and safety; privacy and continuity | Agency-preserving language, understandable sensitive-data controls, clear save/return/follow-up behavior and recovery. |
| `wisdom_mentor_customer_qa_agent` | “Can I explore this in depth, trust that the details agree, and continue without losing context?” | Content consistency; depth and follow-up | Inputs, details, summaries and saved output agree; readable depth and stable detail navigation. |

Use fictional questions and seeded/local test data. Do not infer that one lens describes every member of the group. Any observation about real customer behavior remains a research question until tested with consenting users.

### Exact sub-agent IDs

| Parent agent | Sub-agent ID | Test responsibility |
| --- | --- | --- |
| `gen_z_discovery_customer_qa_agent` | `first_visit_discoverability_subagent` | Entry points, navigation, back behavior, first clear action. |
| `gen_z_discovery_customer_qa_agent` | `task_flow_clarity_subagent` | Choices, progress, loading, completion feedback, error recovery. |
| `gen_z_discovery_customer_qa_agent` | `content_readability_and_output_subagent` | Mobile readability and completeness/privacy of saved or shared output. |
| `emotional_reflection_customer_qa_agent` | `reflective_tone_and_safety_subagent` | Agency, symbolic framing where relevant, fictional distress handling. |
| `emotional_reflection_customer_qa_agent` | `privacy_and_continuity_subagent` | Sensitive inputs, save and return behavior, follow-up expectations. |
| `wisdom_mentor_customer_qa_agent` | `content_consistency_subagent` | Agreement among selected inputs, displayed details, summaries and saved content. |
| `wisdom_mentor_customer_qa_agent` | `depth_and_followup_subagent` | Readable depth, detail navigation, follow-up continuity. |

## Handoff contract

Before invoking a customer agent or its sub-agents, the QA owner records the seven required fields from `packages/agent-config/agent-execution-policy.json`:

```text
taskId: <feature-and-build-specific id>
ownerAgent: qa_review_agent
purpose: <changed mobile flow and question to verify>
writeScope: <exact task-scoped QA report path; no app files>
allowedDataClasses: sanitized_project_context, synthetic_mobile_test_scenarios, sanitized_ui_screenshots
validation: <build/source state, runtime mode, channels and scenarios to run>
stopCondition: <scope expansion, private data, credentials, production action, or missing reproducible evidence>
```

The coding handoff must give the changed behavior, source revision or reviewed dirty-state snapshot, app build identifier if available, known limitations, validation results, entry path, and local fallback or authenticated backend mode. The QA owner selects or writes a feature-specific scenario matrix before testing; the Tarot matrix below is the first pilot. The QA owner assigns a non-overlapping report section or separate report path to each child. A sub-agent may not create another sub-agent unless its parent task explicitly permits it. Agents never receive raw chat, journal entries, birth details, face uploads, account identifiers, tokens, service-role keys, or provider secrets. Screenshots must be sanitized before the handoff.

## Scenario template for any mobile flow

For the changed flow, cover supported entry points and return navigation; the primary customer task and its choices; loading, empty, error, and offline or backend modes; save/share/delete behavior when present; VI/EN and a narrow viewport; privacy and safety copy; and one repeat-use regression that could expose stale state. Assign all three customer lenses, then mark inapplicable checks with a reason. Record results by evidence channel and build state.

## Tarot pilot scenario matrix

Run the affected rows after every Tarot coding change. Run the full path before manager acceptance. Mark a row `pass`, `fail`, `blocked`, or `unverified`; do not silently omit it.

| ID | Path or condition | Main customer lens | Expected observation |
| --- | --- | --- | --- |
| S01 | Home and Explore to Tarot | Gen Z | Entry labels and next step are discoverable; back returns to a sensible place. |
| S02 | Topic, deck list, deck detail, 78-card library and card detail | Gen Z, wisdom | Deck discovery is distinct from drawing; story, meaning, and card navigation remain readable. |
| S03 | Spread choice and one-card-at-a-time draw | Gen Z, wisdom | Progress, card reveal and meaning update after each card; loading and failure states offer recovery. |
| S04 | Completed result and share preview | All | Every selected card and the synthesis agree; small-screen text is readable; preview includes all selected cards. |
| S05 | Save to Journal, reopen, and follow-up | Emotional, wisdom | Save feedback and saved content are clear; navigation retains the correct reading context. |
| S06 | Start a second reading after a completed one | Gen Z, wisdom | **Before drawing**, progress reads `0/N`, no previous result or card selection is visible, and the new spread starts cleanly. This is regression `tarot_second_reading_reset_0_of_n_no_stale_result`. |
| S07 | VI/EN, narrow viewport, back, empty, loading and error states | All | Controls remain legible and reachable, state changes are understandable, and failures do not leak old content. |
| S08 | Reflective/safety copy for a fictional sensitive question | Emotional | Wording does not predict certainty or give medical, legal, financial, or mental-health advice; urgent distress receives the required supportive redirection. |

Keep local fallback and authenticated backend outcomes separate. If an endpoint or signed-in path is unavailable, mark that channel blocked or unverified and state why. Do not use real personal questions to fill the gap.

## Evidence and issue record

For every channel, label what was actually inspected:

- `code_audit`: source-supported risk or implementation trace. It does not prove the issue occurs in the UI.
- `web_export`: reproduced behavior in a named browser and viewport, with the source or build state.
- `native_device`: reproduced behavior on a named device and build. Mark `unverified` until a device test actually runs.

An issue has `issueId`, `personaAgent`, `evidenceChannel`, `buildOrSourceState`, `viewportOrDevice`, `runtimeMode`, `preconditions`, numbered `steps`, `expected`, `actual`, `severity`, `sanitizedEvidence`, `owner`, and `retestStatus`. State `reproduced`, `code_supported_risk`, or `hypothesis` explicitly. For a screenshot, capture the relevant screen and redact personal text and identifiers; use fictional prompts where possible. A code-only concern belongs in `code_supported_risk` until runtime reproduction. Record the old and new build state on retest, plus the same scenario and evidence channel.

Severity is based on customer impact:

| Level | Use when | Acceptance |
| --- | --- | --- |
| P0 | Privacy/safety exposure, destructive data loss, or a severe harmful flow. | Stop; fix and retest before acceptance. |
| P1 | A core customer task is blocked or materially wrong; for Tarot, examples include wrong cards or stale prior reading shown as a new one. | Fix and retest before acceptance. |
| P2 | Recoverable friction, confusing copy, accessibility or layout problem that materially hinders a task. | Record fix owner and explicit disposition; retest if changed. |
| P3 | Minor polish that does not hinder completion. | Record disposition and scope decision. |

`retestStatus` is `not_started`, `pass`, `fail`, or `blocked`. A passing automated check is supporting evidence, not a substitute for the applicable UI path. The QA owner deduplicates findings, links each to a repair acceptance criterion, records residual risks, and asks the manager to review the resulting evidence. The manager can test from the stated entry point without reading code.

## Current Tarot review boundary

The 2026-09-29 Tarot retest has now run on the connected Android device with the local QA bundle. The Journal reopen regression is fixed and verified; the full evidence and remaining `unverified` rows are recorded in [CUSTOMER_PERSPECTIVE_QA_RETEST_2026-09-29.vi.md](/D:/nilaza/docs/CUSTOMER_PERSPECTIVE_QA_RETEST_2026-09-29.vi.md). The role declarations remain synthetic customer lenses, and production release is still a separate decision.
