(function (global) {
  "use strict";
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 164;
  const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const text = (value, locale) => typeof value === "string" ? value : value?.[locale] || value?.en || value?.vi || "";
  const coordinate = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const refs = references => (references || []).map(ref => `<li><code>${escape(typeof ref === "string" ? ref : ref.path)}${ref.symbol ? ` · ${escape(ref.symbol)}` : ""}</code></li>`).join("") || "<li>Reference unavailable</li>";
  const sourceState = state => ({ "implemented-source": "Implemented in reviewed source", "candidate-disabled": "Candidate · provider activation disabled", deferred: "Deferred · no active feature" })[state] || "Source state unknown";
  const selected = (selection, kind, id) => selection?.kind === kind && selection.id === id;

  function getBounds(graph) {
    return {
      width: Math.max(600, ...(graph.nodes || []).map(node => coordinate(node.x) + NODE_WIDTH + 35)),
      height: Math.max(440, ...(graph.nodes || []).map(node => coordinate(node.y) + NODE_HEIGHT + 45))
    };
  }

  function evidenceLabel(evidence, nodeId) {
    const node = evidence?.nodes?.[nodeId];
    return node?.spans?.length ? `Recorded span · ${node.status || "unknown"} · origin unverified` : "No matching record";
  }

  function nodeButton(node, options, list = false) {
    const { locale, selection, evidence } = options;
    const active = selected(selection, "node", node.id);
    const observed = Boolean(evidence?.nodes?.[node.id]?.spans?.length);
    return `<button type="button" class="workflow-graph-node ${active ? "selected" : ""} ${observed ? "observed" : ""} ${list ? "list-node" : ""}" data-workflow-node="${escape(node.id)}" aria-pressed="${active}" ${list ? "" : `style="left:${coordinate(node.x)}px;top:${coordinate(node.y)}px;width:${NODE_WIDTH}px;height:${NODE_HEIGHT}px"`}>
      <span class="graph-node-kind">${escape(node.kind)}</span><strong>${escape(text(node.label, locale))}</strong>
      <span class="graph-source-state">${escape(sourceState(node.sourceState))}</span>
      <span class="graph-observation ${observed ? "observed" : ""}">${escape(evidenceLabel(evidence, node.id))}</span>
    </button>`;
  }

  function edgeLabel(edge, graph, locale) {
    const from = graph.nodes.find(node => node.id === edge.from);
    const to = graph.nodes.find(node => node.id === edge.to);
    return `${text(from?.label, locale) || edge.from} → ${text(to?.label, locale) || edge.to}: ${text(edge.label, locale)} (${edge.kind})`;
  }

  function renderEdges(graph, options) {
    return graph.edges.map(edge => {
      const from = graph.nodes.find(node => node.id === edge.from);
      const to = graph.nodes.find(node => node.id === edge.to);
      if (!from || !to) return "";
      const sx = coordinate(from.x) + NODE_WIDTH, sy = coordinate(from.y) + NODE_HEIGHT / 2;
      const tx = coordinate(to.x), ty = coordinate(to.y) + NODE_HEIGHT / 2;
      const bend = Math.max(24, Math.abs(tx - sx) / 2);
      const path = `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`;
      const active = selected(options.selection, "edge", edge.id);
      const label = text(edge.label, options.locale);
      return `<g role="button" tabindex="0" data-workflow-edge="${escape(edge.id)}" aria-pressed="${active}" aria-label="${escape(edgeLabel(edge, graph, options.locale))}" class="graph-edge ${active ? "selected" : ""} edge-${escape(edge.kind)}"><title>${escape(edgeLabel(edge, graph, options.locale))}</title><path class="graph-edge-hit" d="${path}"/><path class="graph-edge-line" d="${path}" marker-end="url(#workflow-arrow)"/><text x="${(sx + tx) / 2}" y="${(sy + ty) / 2 - 10}" text-anchor="middle">${escape(label.length > 14 ? `${label.slice(0, 11)}…` : label)}</text></g>`;
    }).join("");
  }

  function render(graph, options = {}) {
    const locale = options.locale === "en" ? "en" : "vi";
    const settings = { ...options, locale };
    const zoom = Math.min(1.5, Math.max(0.2, Number(options.zoom) || 1));
    const bounds = getBounds(graph);
    const list = options.mode === "list";
    const legend = [{ kind: "data", label: "Data: solid teal" }, { kind: "control", label: "Control: solid gold" }].filter(item => graph.edges.some(edge => edge.kind === item.kind));
    const body = list
      ? `<div class="workflow-graph-list"><h4>Nodes</h4>${graph.nodes.map(node => nodeButton(node, settings, true)).join("")}<h4>Connections · source mappings, execution not observed</h4>${graph.edges.map(edge => `<button type="button" class="graph-edge-list ${selected(options.selection, "edge", edge.id) ? "selected" : ""}" data-workflow-edge="${escape(edge.id)}" aria-pressed="${selected(options.selection, "edge", edge.id)}">${escape(edgeLabel(edge, graph, locale))}</button>`).join("") || "<p>No connections declared.</p>"}</div>`
      : `<div class="workflow-graph-viewport" id="workflow-graph-viewport" tabindex="0" role="region" aria-label="Read-only workflow graph. Scroll to pan; use List for a linear representation."><div class="workflow-graph-stage" style="width:${bounds.width * zoom}px;height:${bounds.height * zoom}px"><div class="workflow-graph-world" style="width:${bounds.width}px;height:${bounds.height}px;transform:scale(${zoom})"><svg class="workflow-graph-svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}" aria-label="Source connections"><defs><marker id="workflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>${renderEdges(graph, settings)}</svg>${graph.nodes.map(node => nodeButton(node, settings)).join("")}</div></div></div>`;
    return `<section class="workflow-graph-panel" aria-labelledby="workflow-graph-title"><header class="graph-heading"><div><p class="eyebrow">Read-only source graph · ${escape(sourceState(graph.sourceState))}</p><h3 id="workflow-graph-title">${escape(text(graph.title, locale))}</h3></div><div class="graph-controls" role="group" aria-label="Graph view controls"><button type="button" class="button ghost" data-workflow-view="zoom-out" aria-label="Zoom out" ${zoom <= 0.2 ? "disabled" : ""}>−</button><output id="workflow-zoom-level" aria-label="Graph zoom">${Math.round(zoom * 100)}%</output><button type="button" class="button ghost" data-workflow-view="zoom-in" aria-label="Zoom in" ${zoom >= 1.5 ? "disabled" : ""}>+</button><button type="button" class="button ghost" data-workflow-view="fit">Fit</button><button type="button" class="button ghost" data-workflow-view="mode" aria-pressed="${list}">${list ? "Graph" : "List"}</button><button type="button" class="button ghost" data-workflow-view="inspect">View inspector</button></div></header>
      <p class="graph-explanation">Inspect nodes and connections. This source graph cannot run, edit or publish. Cloud deployment is unverified.</p>
      <div class="graph-legend">${legend.map(item => `<span>${item.label}</span>`).join("")}<span>Selected: border + label</span></div>${body}
      <details class="graph-caveats"><summary>Source limitations and references</summary>${(graph.caveats || []).map(item => `<p>${escape(text(item, locale))}</p>`).join("")}<ul>${refs(graph.sourceRefs)}</ul></details></section>`;
  }

  function ports(items, direction, locale) {
    if (!items?.length) return `<p>No ${direction} ports declared in this source review.</p>`;
    return `<div class="graph-port-list">${items.map(port => `<div class="graph-port"><strong><code>${escape(port.name)}</code></strong><span>${escape(port.type || "Type not specified")}</span><dl><dt>${direction === "input" ? "Source" : "Destination"}</dt><dd><code>${escape(port.source || port.destination || "Not specified")}</code></dd><dt>Use</dt><dd>${escape(text(port.usage, locale)) || "Not specified"}</dd><dt>Privacy</dt><dd>${escape(port.privacy || "Not specified")}</dd></dl></div>`).join("")}</div>`;
  }

  function renderInspector(graph, options = {}) {
    const locale = options.locale === "en" ? "en" : "vi";
    const selection = options.selection;
    const edge = selection?.kind === "edge" ? graph.edges.find(item => item.id === selection.id) : null;
    const node = selection?.kind === "node" ? graph.nodes.find(item => item.id === selection.id) : null;
    if (edge) return `<aside class="workflow-graph-inspector" id="workflow-graph-inspector" aria-live="polite"><p class="eyebrow">Selected connection · ${escape(edge.kind)}</p><h3>${escape(text(edge.label, locale))}</h3><p>${escape(edge.from)} → ${escape(edge.to)}</p><h4>Condition</h4><p>${escape(text(edge.condition, locale)) || "No condition declared"}</p><h4>Field mappings</h4>${edge.mappings?.length ? edge.mappings.map(mapping => `<div class="graph-port"><code>${escape(mapping.from)} → ${escape(mapping.to)}</code><p>${escape(text(mapping.usage, locale))}</p></div>`).join("") : "<p>Control connection; no data field mapping declared.</p>"}<h4>Observation</h4><p>Not observed. Per-edge execution and field transfers are not instrumented by this view.</p><h4>Source references</h4><ul>${refs(edge.sourceRefs)}</ul></aside>`;
    if (node) {
      const observation = options.evidence?.nodes?.[node.id];
      return `<aside class="workflow-graph-inspector" id="workflow-graph-inspector" aria-live="polite"><p class="eyebrow">Selected node · ${escape(node.kind)}</p><h3>${escape(text(node.label, locale))}</h3><p>${escape(text(node.description, locale))}</p><p class="graph-source-state">${escape(sourceState(node.sourceState))}</p><h4>Inputs</h4>${ports(node.inputs, "input", locale)}<h4>Outputs</h4>${ports(node.outputs, "output", locale)}<h4>Recorded trace</h4>${observation?.spans?.length ? `<p>${escape(evidenceLabel(options.evidence, node.id))}</p>${observation.spans.map(span => `<p><code>${escape(span.name)}</code> · ${escape(span.status)}</p>`).join("")}<p>Writer origin is unverified: authenticated clients can submit trace records. A recorded span does not prove a provider ran, every field was used, the output was saved, or the app displayed a response. Token use, cost and latency are not projected here.</p>` : "<p>No matching record. Missing spans are unknown; absence does not prove the node was skipped.</p>"}<h4>Source references</h4><ul>${refs(node.sourceRefs)}</ul></aside>`;
    }
    return `<aside class="workflow-graph-inspector" id="workflow-graph-inspector"><h3>Inspect a node or connection</h3><p>Inputs, outputs, field usage and source references appear here. Use List for keyboard navigation through all nodes and connections.</p></aside>`;
  }

  global.NilazaWorkflowView = Object.freeze({ render, renderInspector, getBounds });
})(window);
