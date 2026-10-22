import { displayValue, selectLocale, validateWaitlistAggregate, viewModel } from "./growth-model.mjs";
import { validateGrowthSnapshot, claimReview } from "./growth-operations-model.mjs";
const $ = selector => document.querySelector(selector);
const content = $("#growth-content"), status = $("#growth-status"), badge = $("#growth-source-badge");
const reviewFixture = $("#review-fixture"), refreshButton = $("#refresh-growth");
let dataset, snapshot;
let locale = "all", selectedAsset = "", generation = 0, fixtureGeneration = 0;
let repositoryState = "loading", liveState = "loading", authorized = false;
const h = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
const t = (vi, en) => locale === "en" ? en : vi;
const localized = value => typeof value === "string" ? value : value?.[locale === "en" ? "en" : "vi"] || value?.en || "—";
const list = values => (values || []).map(value => `<li>${h(value)}</li>`).join("");
const stateNames = {
  internal_foundation: ["Nền tảng nội bộ", "Internal foundation"],
  prepared_not_recruited: ["Đã chuẩn bị, chưa phỏng vấn", "Prepared, no interviews"],
  concepts_pending_review: ["Concept chờ review", "Concepts awaiting review"],
  synthetic_only: ["Chỉ demo tổng hợp", "Synthetic demo only"],
  deferred: ["Giai đoạn sau", "Deferred"],
  ready_for_internal_work: ["Có thể tiếp tục nội bộ", "Ready for internal work"],
  awaiting_editorial_review: ["Chờ review nội dung", "Awaiting editorial review"],
  blocked_by_release_acceptance: ["Chờ nghiệm thu bản beta", "Awaiting beta acceptance"],
  blocked_by_channel_readiness: ["Chờ nền tảng kênh", "Awaiting channel readiness"],
  blocked_by_measurement_and_approval: ["Chờ đo lường và phê duyệt", "Awaiting measurement and approval"],
  brand_verified: ["Brand đã kiểm chứng", "Brand verified"]
};
const stateLabel = value => stateNames[value] ? t(...stateNames[value]) : value?.startsWith("integrated_") ? t("Đã tích hợp · còn cổng nghiệm thu", "Integrated · acceptance gates remain") : value;
const repositoryRoutes = new Set(["overview", "product-truth", "content-drafts", "measurement", "roadmap"]);
const routeMeta = {
  overview: ["Tổng quan Growth", "Growth overview", "Hiện trạng sản phẩm, workflow và công việc ưu tiên.", "Product evidence, workflows and priority work."],
  "product-truth": ["Hiện trạng sản phẩm", "Product readiness", "Claim, bằng chứng và giới hạn trước khi dùng nội dung bên ngoài.", "Claims, evidence and limits before external use."],
  "content-drafts": ["Draft nội dung", "Content drafts", "Concept VI/EN, brief, claim và review còn thiếu.", "VI/EN concepts, briefs, claims and missing review."],
  measurement: ["Đo lường", "Measurement", "Event trong source và pipeline aggregate đã được kiểm chứng.", "Source instrumentation and verified aggregate pipelines."],
  roadmap: ["Bước tiếp theo", "Next steps", "Việc cần hoàn tất, người phụ trách và đường nghiệm thu.", "Remaining work, responsible teams and acceptance."],
  waitlist: ["Waitlist", "Waitlist overview", "Số đếm contact từ RPC có phân quyền.", "Capability-gated aggregate contact counts."],
  "campaign-map": ["Luồng campaign", "Campaign map", "Luồng đề xuất; pool contact chưa đủ điều kiện gửi.", "Proposed sequence; pools are not send-eligible audiences."],
  "delivery-health": ["Tình trạng delivery", "Delivery health", "Ledger và suppression; chưa có worker tự động.", "Ledger and suppression; no automated worker."]
};
const featureNames = {
  nilaza_open_reflection_brand: ["Open Reflection", "Open Reflection"],
  nilaza_tarot_reflection: ["Tarot phản chiếu", "Tarot reflection"],
  nilaza_ai_guides_and_council: ["AI Guides & Council", "AI Guides & Council"],
  nilaza_journal_revisit: ["Nhật ký & quay lại", "Journal & revisit"],
  nilaza_astrology_preparation: ["Bản đồ sao & thần thoại", "Birth chart & mythology"]
};
function metric(label, value, note, warning = false) {
  return `<article class="metric-card${warning ? " warning" : ""}"><span>${h(label)}</span><strong>${h(displayValue(value))}</strong><small>${h(note)}</small></article>`;
}
const refs = values => `<ul class="source-list">${list(values)}</ul>`;
const eventSources = event => (event.sourceBindings || []).map(binding => `<small>${h(binding.name)} · ${h(binding.persistence)}<br>${h(binding.path)}<br>${h(binding.availability)}</small>`).join("");
const routeButton = (route, label) => `<button type="button" class="review-fixture" data-growth-route="${h(route)}">${h(label)}</button>`;
function navigate(route) {
  if (!Object.hasOwn(routeMeta, route)) return;
  if (window.parent !== window) window.parent.location.hash = `#/growth/${route}`;
  location.hash = route;
}
function taskCard(task) {
  return `<article class="panel task-card"><p class="eyebrow">${h(task.priority)} · ${h(task.id)}</p><h2>${h(localized(task.title))}</h2><p class="panel-copy">${h(task.owner)} · ${h(stateLabel(task.status))}</p><p>${h(localized(task.nextAction))}</p><h3>${t("Nghiệm thu", "Acceptance")}</h3><p>${h(localized(task.acceptance))}</p><h3>${t("Phụ thuộc", "Dependencies")}</h3><ul>${list(task.dependencies)}</ul>${refs(task.evidenceRefs)}</article>`;
}
function renderOverview() {
  content.innerHTML = `<div class="guardrail"><strong>${t("Review nội bộ · beta công khai/thu phí/store còn cổng nghiệm thu.", "Internal review · public beta, payment and store release remain gated.")}</strong> ${h(localized(snapshot.roadmap.summary))}</div>
    <div class="metric-grid growth-summary">${metric("Briefs",snapshot.briefs.length,t("Giả thuyết, chưa là nghiên cứu khách hàng", "Hypotheses, not customer research"))}${metric("Concept VI/EN",snapshot.assets.length,t("Chờ creative và editorial review", "Await creative and editorial review"))}${metric(t("Workflow nền tảng", "Foundation workflows"),snapshot.readiness.implementedWorkflowIds.length,t("Draft/contract, chưa là agent runtime", "Drafts/contracts, not an agent runtime"))}${metric(t("Kênh thực thi", "Execution channels"),0,t("Email, social, paid chưa kích hoạt", "Email, social and paid inactive"),true)}</div>
    <div class="section-heading"><h2>${t("Năng lực hiện có", "Current capabilities")}</h2>${routeButton("content-drafts",t("Xem draft", "Review drafts"))}</div><div class="operations-grid">${snapshot.roadmap.workflows.map(w => `<article class="panel"><p class="eyebrow">${h(w.id)}</p><h3>${h(stateLabel(w.state))}</h3><p>${h(localized(w.output))}</p></article>`).join("")}</div>
    <details class="panel"><summary>${t("Nguồn nghiên cứu đã chuẩn bị", "Prepared research sources")} · ${snapshot.research.sources.length}</summary><p>${t("Nguồn kế hoạch/QA nội bộ, chưa thay thế phỏng vấn người dùng thật.", "Internal planning/QA sources, not real-user interviews.")}</p>${refs(snapshot.research.sources.map(source => `${source.reference} · ${source.evidenceRole || source.type}`))}</details>
    <div class="section-heading"><h2>${t("Ưu tiên tiếp theo", "Next priorities")}</h2>${routeButton("roadmap",t("Xem toàn bộ việc", "View all work"))}</div><div class="operations-grid">${snapshot.roadmap.tasks.slice(0,3).map(taskCard).join("")}</div><p class="guardrail">${t("Waitlist có nguồn riêng; lỗi kết nối không biến snapshot repo thành dữ liệu live.", "Waitlist has its own source; connection failure does not turn repository evidence into live data.")} ${routeButton("waitlist","Waitlist")}</p>`;
}
function renderProduct() {
  content.innerHTML = `<p class="guardrail">${t("Đã tích hợp, kiểm thử nội bộ và đã phát hành là các trạng thái khác nhau. Android QA cũ không chứng nhận mọi luồng trên build mới hoặc iOS.", "Integrated, internally tested and released are distinct. Historical Android QA does not certify every flow on a new build or iOS.")}</p><div class="operations-grid">${snapshot.productTruth.features.map(feature => {
    const names = featureNames[feature.id] || [feature.id,feature.id];
    return `<article class="panel product-card"><p class="eyebrow">${h(feature.platforms.join(" / "))}</p><h2>${h(t(...names))}</h2><p class="state-label" title="${h(feature.status)}">${h(stateLabel(feature.status))}</p>${feature.claims.map(claim => {
      const review = claimReview(snapshot,claim.id);
      return `<div class="claim"><h3>${h(claim.id)}</h3><p>${h(localized(claim.copy))}</p><small>${h(claim.allowedSurfaces.join(" / "))} · ${t("Hết hạn", "Expires")} ${h(claim.expiresAt)}</small><p class="${review.usable ? "panel-copy" : "expired-note"}">${review.usable ? t("Có bằng chứng theo ngày review; chưa là phê duyệt publish.", "Evidence exists as of review; this is not publishing approval.") : t("Bằng chứng thiếu/hết hạn: review lại trước khi tái dùng.", "Missing/expired evidence: review before reuse.")}</p>${refs(review.evidence.map(e => `${e.reference} · ${e.type} · ${e.expiresAt}`))}</div>`;
    }).join("")}<h3>${t("Không được khẳng định", "Prohibited claims")}</h3><ul>${list(feature.prohibitedClaims)}</ul></article>`;
  }).join("")}</div>`;
}
function renderDrafts() {
  if (!snapshot.assets.length) { content.innerHTML = `<p class="guardrail">${t("Chưa có draft. Tạo brief và concept nội bộ trước.", "No drafts yet. Prepare an internal brief and concept first.")}</p>`; return; }
  const asset = snapshot.assets.find(a => a.id === selectedAsset) || snapshot.assets[0]; selectedAsset = asset.id;
  const brief = snapshot.briefs.find(b => b.id === asset.briefId), locales = locale === "all" ? ["vi","en"] : [locale];
  content.innerHTML = `<p class="guardrail">${t("Concept/copy, chưa là creative render. QA seed là metadata tự khai báo; review độc lập gắn hash và human approval chưa hoàn tất.", "Concept/copy, not rendered creative. Seed QA is self-reported metadata; hash-bound independent review and human approval are incomplete.")}</p><label class="draft-picker">${t("Chọn draft", "Choose a draft")}<select id="draft-selector">${snapshot.assets.map(a => `<option value="${h(a.id)}"${a.id === asset.id ? " selected" : ""}>${h(a.id)} · ${h(a.format)} · v${h(a.version)}</option>`).join("")}</select></label>
    <div class="panel-grid"><article class="panel"><p class="eyebrow">${h(asset.id)} · v${h(asset.version)} · ${h(asset.format)}</p><h2>${t("Bản xem nội dung", "Copy preview")}</h2><div class="copy-grid">${locales.map(key => `<section lang="${key}"><h3>${key.toUpperCase()}</h3><h2>${h(asset.copy[key].headline)}</h2><p>${h(asset.copy[key].body)}</p><p>${h(asset.copy[key].caption)}</p><p class="preview-cta">${h(asset.copy[key].cta)}</p><small>Alt: ${h(asset.copy[key].altText)}</small></section>`).join("")}</div><h3>Visual brief</h3><p>${h(asset.visualBrief.source)} · ${h(asset.visualBrief.reference)}</p><p class="panel-copy">${t("Chưa có ảnh/video render trong gói này.", "No rendered image/video is attached to this concept package.")}</p></article>
    <article class="panel"><h2>${t("Review và phụ thuộc", "Review and dependencies")}</h2><dl class="definition-list"><div><dt>Brief</dt><dd>${h(brief?.id)} · ${h(brief?.hypothesis)}</dd></div><div><dt>QA metadata</dt><dd>${h(asset.qa.automatedVerdict)} / ${h(asset.qa.independentQaStatus)}<br>${h(asset.qa.reviewReason || "")}</dd></div><div><dt>${t("Phê duyệt bên ngoài", "External approval")}</dt><dd>${t("Chưa có · không cấp quyền thực thi", "None · no execution authority")}</dd></div><div><dt>${t("Chỉ số mục tiêu", "Planned metric")}</dt><dd>${h(asset.measurement.primaryMetric)} · ${h(asset.measurement.denominator)}</dd></div></dl><h3>${t("Cổng còn chặn", "Blocking gates")}</h3><ul>${list(asset.externalReadiness.blockingGates)}</ul><h3>Claims</h3>${asset.claimRefs.map(ref => {
      const review = claimReview(snapshot,ref);
      return `<p>${h(ref)} · ${h(review.status)}</p><p>${h(localized(review.claim?.copy))}</p>${refs(review.evidence.map(e => e.reference))}`;
    }).join("")}${routeButton("product-truth",t("Xem ProductTruth", "Inspect ProductTruth"))}</article></div>`;
}
function renderMeasurement() {
  content.innerHTML = `<p class="guardrail"><strong>${t("Activation/retention/contribution: chưa có dữ liệu đáng tin.", "Activation/retention/contribution: reliable data is unavailable.")}</strong> ${h(snapshot.measurement.rule)}</p><article class="panel"><h2>North star: ${h(snapshot.business.northStar.id)}</h2><p>${h(snapshot.business.northStar.meaning)}</p><p>${t("Không suy value day từ app open, số reply hoặc số draft.", "Do not infer value days from app opens, reply counts or draft counts.")}</p></article><div class="table-scroll"><table class="suppression-table"><thead><tr><th>Event</th><th>Owner</th><th>${t("Hiện trạng / source", "State / source")}</th><th>${t("Chỉ số live", "Live metric")}</th></tr></thead><tbody>${snapshot.measurement.events.map(e => `<tr><td>${h(e.id)}<small>${h(e.purpose)}</small></td><td>${h(e.owner)}</td><td>${h(e.state)}${eventSources(e)}</td><td>${t("Chưa khả dụng", "Unavailable")}</td></tr>`).join("")}</tbody></table></div><div class="panel-grid"><article class="panel"><h2>${t("Dữ liệu không được dùng", "Forbidden dimensions")}</h2><ul>${list(snapshot.measurement.forbiddenDimensions)}</ul></article><article class="panel"><h2>${t("Bằng chứng cần tiếp", "Next evidence")}</h2><p>${t("Learning hiện chỉ là giả thuyết và demo tổng hợp.", "Learning currently consists of hypotheses and synthetic demos.")}</p><ul>${list(snapshot.learning.nextEvidenceNeeded)}</ul>${routeButton("roadmap",t("Việc đo lường tiếp theo", "Measurement work"))}</article></div>`;
}
function renderRoadmap() {
  content.innerHTML = `<p class="guardrail">${h(localized(snapshot.roadmap.summary))} ${t("Backlog theo bằng chứng, chưa là job chạy hoặc phê duyệt triển khai.", "Evidence-based backlog, not running jobs or deployment approval.")}</p><div class="operations-grid">${snapshot.roadmap.tasks.map(taskCard).join("")}</div>`;
}
function renderWaitlist(model) {
  const s = model.segment;
  const rows = [[t("Contact duy nhất", "Unique contacts"),s.requested],["Confirmed",s.confirmed],["Engaged",s.engaged],["Invited",s.invited],["Accepted",s.accepted]];
  const max = Math.max(1,...rows.map(([,v]) => typeof v === "number" ? v : 0));
  content.innerHTML = `<div class="metric-grid">${metric(t("Contact duy nhất", "Unique contacts"),s.requested,t("Contact đã lưu, không phải số lần submit", "Stored contacts, not submission attempts"))}${metric("Confirmed",s.confirmed,`${model.confirmationRate} / contacts`)}${metric("Engaged",s.engaged,`${model.engagementRate} / confirmed`)}${metric("Invited",s.invited,t("Chưa xác định cohort đủ điều kiện", "Send eligibility not established"))}${metric("Accepted",s.accepted,`${model.acceptanceRate} / invited`)}${metric(t("Contact bị dừng", "Stopped contact statuses"),[s.unsubscribed,s.bounced,s.complained].every(Number.isFinite) ? s.unsubscribed+s.bounced+s.complained : null,t("Không là tổng suppression; chưa gồm manual", "Not the active suppression union; excludes manual"),true)}</div><div class="panel-grid"><article class="panel"><h2>${t("Funnel review", "Review funnel")}</h2><p class="panel-copy">${model.isLive ? t("Số đếm từ RPC protected.", "Counts from the protected RPC.") : t("Số liệu giả lập, không phải live.", "Synthetic review counts, not live data.")} ${t("Các stage không cộng thành tổng người dùng.", "Stages are not additive.")}</p>${rows.map(([label,v]) => `<div class="funnel-row"><span>${h(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${typeof v === "number" ? Math.round(v/max*100) : 0}%"></div></div><strong>${h(displayValue(v))}</strong></div>`).join("")}</article><article class="panel"><h2>${t("Định nghĩa và giới hạn", "Definitions and limits")}</h2><p>${t("Confirmed pool chưa loại suppression, acceptance, delay hoặc frequency cap; không dùng để gửi. Engagement live chưa nối provider events. Thiếu mẫu số hiển thị Unavailable.", "The confirmed pool does not enforce suppression, acceptance, delays or frequency caps; do not use for sends. Live engagement lacks provider events. Missing denominators show Unavailable.")}</p>${routeButton("delivery-health",t("Xem suppression", "Inspect suppression"))}</article></div>`;
}
function renderCampaign(model) {
  content.innerHTML = `<p class="guardrail"><strong>Campaign is paused by design.</strong> ${t("Chỉ confirmed, non-suppressed contacts mới có thể vào worker tương lai sau mọi cổng. Pool dưới đây chưa kiểm eligibility.", "Only confirmed, non-suppressed contacts may enter a future worker after all gates. Pools below do not establish eligibility.")} ${routeButton("roadmap",t("Xem điều kiện cần", "View prerequisites"))}</p><div class="campaign-map">${model.steps.map((s,i) => `<article class="campaign-node"><span class="step">${i+1} · ${h(s.timing)}</span><h2>${h(s.label)}</h2><p>${t("Lịch tham khảo, chưa schedule. Không là tỷ lệ chuyển bước có attribution.", "Proposed timing, not scheduled. Counts are not attributed step conversion.")}</p><div class="node-stats"><div><span>${s.id === "confirm" ? "Contact pool" : s.id === "invite" ? "Invite records" : "Confirmed pool"}</span><strong>${h(displayValue(s.metrics.eligible))}</strong></div><div><span>${s.id === "confirm" ? "Confirmed" : s.id === "invite" ? "Accepted" : "Sent/delivered"}</span><strong>${h(displayValue(s.metrics.advanced))}</strong></div></div></article>`).join("")}</div>`;
}
function renderHealth(model) {
  const v = model.deliveryHealth;
  content.innerHTML = `<div class="health-grid">${metric("Queued",v.queued,t("Ledger records, chưa có worker", "Ledger records, no worker active"))}${metric("Retry",v.retry,"Transient failures",v.retry>0)}${metric("Dead letter",v.deadLetter,"Permanent failures",v.deadLetter>0)}</div><div class="table-scroll"><table class="suppression-table"><thead><tr><th>Suppression reason</th><th>Required behavior</th><th>Active reason records</th></tr></thead><tbody>${model.suppressions.map(i => `<tr><td>${h(i.reason)}</td><td>${h(i.behavior)}</td><td>${h(displayValue(i.count))}</td></tr>`).join("")}</tbody></table></div><p class="guardrail">${t("Reason có thể chồng lấp; không cộng thành người duy nhất.", "Reasons can overlap; do not sum into unique contacts.")} Provider flag: ${dataset.deliveryHealth.providerConnected ? "connected" : "not connected"}. ${t("Flag không thay health check. Worker, Cron và email tự động chưa kích hoạt.", "A flag is not a health check. Worker, Cron and automated email remain inactive.")}</p>`;
}
function render() {
  const route = Object.hasOwn(routeMeta,location.hash.slice(1)) ? location.hash.slice(1) : "overview", meta = routeMeta[route];
  $("#view-title").textContent = t(meta[0],meta[1]); $("#view-description").textContent = t(meta[2],meta[3]);
  document.documentElement.lang = locale === "en" ? "en" : "vi";
  const repository = repositoryRoutes.has(route), state = repository ? repositoryState : liveState, available = repository ? snapshot : dataset;
  const live = !repository && dataset?.classification === "live_aggregate";
  badge.textContent = repository ? "Repository snapshot · internal review" : live ? "Live aggregate · no PII" : dataset ? "Synthetic review fixture" : "Live aggregate unavailable";
  badge.classList.toggle("live",live);
  $("#growth-connection-state").textContent = repository ? t("Cấu hình theo ngày review, không là runtime live", "Dated configuration, not live runtime") : live ? "Protected read model" : t("Chưa kết nối live sends", "Not connected to live sends");
  $("#fixture-source").textContent = repository ? "Canonical Growth configuration" : dataset?.source || "Supabase aggregate RPC";
  $("#fixture-date").textContent = repository ? snapshot?.reviewedAt || "—" : dataset?.generatedAt || dataset?.snapshotDate || "—";
  reviewFixture.hidden = repository || liveState !== "error" || !authorized;
  status.hidden = Boolean(available); status.classList.toggle("error",state === "error");
  status.textContent = state === "loading" ? t("Đang tải nguồn…", "Loading source…") : !authorized ? t("Chưa xác minh quyền Admin. Đăng nhập hoặc thử lại nguồn.", "Admin access unverified. Sign in or refresh sources.") : repository ? t("Snapshot Growth thiếu, lỗi hoặc sai contract. Thử lại sau khi kiểm tra generated snapshot.", "Growth snapshot missing, invalid or unavailable. Refresh after checking generated snapshot.") : t("Live aggregate is unavailable. Thử lại nguồn hoặc chọn Review synthetic fixture để xem dữ liệu giả lập có nhãn.", "Live aggregate is unavailable. Refresh or explicitly choose Review synthetic fixture for labeled sample data.");
  $("#growth-privacy-note").textContent = t("Chỉ cấu hình đã chọn lọc và số đếm tổng hợp. Không có email, token, UTM, chat/Journal hoặc dữ liệu sinh. Review không cấp quyền publish/send/spend.", "Selected configuration and aggregate counts only. No emails, tokens, UTM, chat/Journal text or birth data. Review grants no publish/send/spend authority.");
  if (!available) { content.replaceChildren(); return; }
  if (repository) {
    if (route === "product-truth") renderProduct(); else if (route === "content-drafts") renderDrafts(); else if (route === "measurement") renderMeasurement(); else if (route === "roadmap") renderRoadmap(); else renderOverview();
  } else {
    const model = viewModel(dataset,locale);
    if (route === "campaign-map") renderCampaign(model); else if (route === "delivery-health") renderHealth(model); else renderWaitlist(model);
  }
}
async function loadSources() {
  const current = ++generation;
  fixtureGeneration++;
  reviewFixture.disabled = false;
  repositoryState = liveState = "loading"; dataset = snapshot = undefined; refreshButton.disabled = true; render();
  try {
    const access = Boolean(await window.NilazaRequireCapability("overview.read"));
    if (current !== generation) return;
    authorized = access; if (!authorized) throw Error("Access unavailable");
    await Promise.allSettled([
      (async () => {
        try {
          const response = await fetch("./generated/growth-operations.json",{cache:"no-store"});
          if (!response.ok) throw Error("Snapshot unavailable");
          const data = await response.json(); if (!validateGrowthSnapshot(data).valid) throw Error("Invalid snapshot");
          if (current !== generation) return; snapshot = data; repositoryState = "ready";
        } catch { if (current === generation) repositoryState = "error"; }
        if (current === generation) render();
      })(),
      (async () => {
        try {
          const live = await window.NilazaAdminRpc("get_growth_waitlist_overview",{},"overview.read");
          if (live?.classification !== "live_aggregate" || !validateWaitlistAggregate(live)) throw Error("Invalid aggregate");
          if (current !== generation) return; dataset = live; liveState = "ready";
        } catch { if (current === generation) liveState = "error"; }
        if (current === generation) render();
      })()
    ]);
  } catch { if (current === generation) { authorized = false; repositoryState = liveState = "error"; } }
  finally { if (current === generation) { refreshButton.disabled = false; render(); } }
}
$(".locale-filter").addEventListener("click",event => {
  const b = event.target.closest("[data-locale]"); if (!b) return; locale = selectLocale(b.dataset.locale);
  document.querySelectorAll("[data-locale]").forEach(i => { i.classList.toggle("active",i === b); i.setAttribute("aria-pressed",String(i === b)); }); render();
});
content.addEventListener("click",event => { const b = event.target.closest("[data-growth-route]"); if (b) navigate(b.dataset.growthRoute); });
content.addEventListener("change",event => { if (event.target.id === "draft-selector") { selectedAsset = event.target.value; render(); } });
window.addEventListener("hashchange",render);
refreshButton.addEventListener("click",() => { void loadSources(); });
reviewFixture.addEventListener("click",async () => {
  const current = generation, attempt = ++fixtureGeneration; reviewFixture.disabled = true;
  try {
    if (!await window.NilazaRequireCapability("overview.read")) throw Error("Access unavailable");
    const response = await fetch("./marketing-automation-sample.json",{cache:"no-store"}); if (!response.ok) throw Error("Fixture unavailable");
    const fixture = await response.json();
    if (fixture.classification !== "synthetic_review_fixture" || !validateWaitlistAggregate(fixture) || JSON.stringify(fixture).includes("@")) throw Error("Invalid fixture");
    if (current === generation && attempt === fixtureGeneration) { dataset = fixture; render(); }
  } catch { if (current === generation && attempt === fixtureGeneration) { dataset = undefined; render(); status.textContent = t("Không tải được fixture hoặc quyền đã đổi.", "Review fixture unavailable or permission changed."); } }
  finally { if (current === generation && attempt === fixtureGeneration) reviewFixture.disabled = false; }
});
window.NilazaClearSensitiveAdminState = () => {
  generation++; fixtureGeneration++; authorized = false;
  dataset = undefined; liveState = "error";
  if (!snapshot) repositoryState = "error";
  refreshButton.disabled = reviewFixture.disabled = false; render();
};
await window.NilazaAdminSessionPromise;
await loadSources();
