// Public reading position only, consumed once in this tab. No permanent preference.
const storageKey = "nilaza-language-position-v1";
const normalizePath = (path: string) => path.replace(/\/+$/, "");
type ReadingPosition = { path: string; anchor: string; progress: number; savedAt: number };

export function initializeLanguageNavigation() {
  const sections = [...document.querySelectorAll<HTMLElement>("main > section")];
  // Equivalent translated templates have the same section order on secondary pages.
  sections.forEach((section, index) => { if (!section.id) section.id = `locale-section-${index}`; });
  const footer = document.querySelector<HTMLElement>("footer");
  if (footer && !footer.id) footer.id = "site-footer";
  const anchors = [...document.querySelectorAll<HTMLElement>("main > section, main [data-language-anchor], footer")];
  const readingLine = () => (document.querySelector(".site-header")?.getBoundingClientRect().height || 0) + 16;
  const capture = (path: string): ReadingPosition | undefined => {
    const line = readingLine();
    const anchor = anchors.filter(element => element.id && element.getBoundingClientRect().top <= line + 1).pop() || anchors[0];
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    return { path, anchor: anchor.id, progress: Math.min(1, Math.max(0, (line - rect.top) / Math.max(1, rect.height))), savedAt: Date.now() };
  };
  const picker = document.querySelector<HTMLDetailsElement>(".language-picker");
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-language-link]")];
  const prepare = (link: HTMLAnchorElement, save = false) => {
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    const position = capture(normalizePath(url.pathname));
    if (!position) return;
    url.hash = position.anchor;
    link.href = url.href;
    if (save) {
      try { sessionStorage.setItem(storageKey, JSON.stringify(position)); } catch { /* Fragment still preserves the section. */ }
    }
  };
  picker?.addEventListener("toggle", () => { if (picker.open) links.forEach(link => prepare(link)); });
  links.forEach(link => {
    link.addEventListener("pointerdown", () => prepare(link));
    link.addEventListener("contextmenu", () => prepare(link));
    link.addEventListener("click", event => prepare(link, !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0));
  });

  let position: ReadingPosition;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    const value = JSON.parse(raw);
    if (typeof value.savedAt !== "number" || Date.now() - value.savedAt > 120000 || value.savedAt > Date.now()) {
      sessionStorage.removeItem(storageKey); return;
    }
    if (value.path !== normalizePath(location.pathname) || value.anchor !== decodeURIComponent(location.hash.slice(1))) return;
    sessionStorage.removeItem(storageKey);
    if (typeof value.anchor !== "string" || !/^[a-zA-Z][\w-]{0,120}$/.test(value.anchor) || !Number.isFinite(value.progress) || value.progress < 0 || value.progress > 1) return;
    position = value;
  } catch { return; }
  const anchor = document.getElementById(position.anchor);
  if (!anchor) return;
  let userScrolled = false;
  window.addEventListener("wheel", () => { userScrolled = true; }, { once: true, passive: true });
  window.addEventListener("touchstart", () => { userScrolled = true; }, { once: true, passive: true });
  window.addEventListener("keydown", event => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) userScrolled = true; });
  const restore = () => {
    if (userScrolled) return;
    const rect = anchor.getBoundingClientRect();
    const top = Math.max(0, window.scrollY + rect.top + position.progress * rect.height - readingLine());
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top, left: 0, behavior: "auto" });
    document.documentElement.style.scrollBehavior = previous;
  };
  requestAnimationFrame(restore);
  if (document.readyState !== "complete") window.addEventListener("load", restore, { once: true });
  document.fonts?.ready.then(restore);
}
