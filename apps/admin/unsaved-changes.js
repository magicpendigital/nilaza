(function () {
  // Unsaved-change guard shared by every Admin page (spec 04/11 §1.6, proposal 03/11 §5).
  // A workspace reports how many changes have not reached the server yet; while the
  // count is above zero, leaving or reloading the page asks the browser to confirm.
  // Inside the shell the count is also sent to the parent so its top bar can show it.
  const counts = new Map();
  let workspace = "";
  function total() {
    let sum = 0;
    for (const value of counts.values()) sum += value;
    return sum;
  }
  function warn(event) {
    if (!total()) return undefined;
    event.preventDefault();
    // Older browsers need returnValue; the text itself is replaced by the browser.
    event.returnValue = "Còn thay đổi chưa lưu.";
    return event.returnValue;
  }
  window.addEventListener("beforeunload", warn);
  function report() {
    if (window.parent === window) return;
    try {
      window.parent.postMessage({ type: "nilaza.admin.unsaved", workspaceId: workspace, count: total() }, window.location.origin);
    } catch { /* the shell indicator is optional */ }
  }
  window.NilazaUnsaved = Object.freeze({
    setWorkspace(id) { workspace = String(id || ""); report(); },
    set(source, count) {
      const value = Math.max(0, Math.floor(Number(count) || 0));
      if (value) counts.set(String(source), value); else counts.delete(String(source));
      report();
      return total();
    },
    total,
    label(count = total()) { return count ? `${count} thay đổi chưa lưu` : "Không có thay đổi chưa lưu"; }
  });
})();
