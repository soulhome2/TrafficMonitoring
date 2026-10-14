/* ONE PSIM Prototype Kit — minimal runtime (D-007). Plain JS, no build, driven by data attributes so a
 * template stays ordinary HTML. Covers only what a reviewer needs to follow a flow: theme, drawer, tabs,
 * dialog, menu, segmented toggle. Everything else (filters, sorting, fixture data) lives in the page.
 *
 *   data-kit-theme            button: toggles [data-theme] on <html>, remembers in localStorage
 *   data-kit-drawer="#id"     button: opens the drawer; [data-kit-close] inside closes; scrim/Esc close
 *   data-kit-tabs             container with [role=tab] buttons and [role=tabpanel] panels (aria-controls)
 *   data-kit-dialog="#id"     button: showModal() on the <dialog>; [data-kit-close] closes
 *   data-kit-menu="#id"       button: toggles a .menu or a .popover (any content), closes on outside click / Esc;
 *                             positioned under the button, flipped above / aligned right when it would overflow
 *   data-kit-seg              container of buttons; click sets aria-pressed on one, clears the rest
 */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const KEY = "kit-theme";

  // ---- theme -------------------------------------------------------------------------------------
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  else if (!root.getAttribute("data-theme")) root.setAttribute("data-theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-kit-theme]");
    if (!b) return;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(KEY, next);
    document.dispatchEvent(new CustomEvent("kit:theme", { detail: next }));
  });

  // ---- drawer ------------------------------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-kit-drawer]");
    if (open) {
      const d = $(open.getAttribute("data-kit-drawer"));
      if (!d) return;
      d.setAttribute("data-open", "");
      let scrim = d.previousElementSibling;
      if (!scrim || !scrim.classList.contains("drawer-scrim")) {
        scrim = document.createElement("div");
        scrim.className = "drawer-scrim";
        d.before(scrim);
      }
      scrim.hidden = false;
      scrim.onclick = () => closeDrawer(d);
      ($("[data-kit-close]", d) || d).focus?.();
      return;
    }
    const close = e.target.closest(".drawer [data-kit-close]");
    if (close) closeDrawer(close.closest(".drawer"));
  });
  function closeDrawer(d) {
    d.removeAttribute("data-open");
    const scrim = d.previousElementSibling;
    if (scrim && scrim.classList.contains("drawer-scrim")) scrim.hidden = true;
  }

  // ---- tabs --------------------------------------------------------------------------------------
  $$("[data-kit-tabs]").forEach((group) => {
    const tabs = $$("[role=tab]", group);
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const p = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus();
        select(n);
      });
    });
    select(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
  });

  // ---- dialog ------------------------------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-kit-dialog]");
    if (open) {
      const d = $(open.getAttribute("data-kit-dialog"));
      if (d && typeof d.showModal === "function") {
        document.dispatchEvent(new CustomEvent("kit:dialog", { detail: { dialog: d, trigger: open } }));
        d.showModal();
      }
      return;
    }
    const close = e.target.closest("dialog [data-kit-close]");
    if (close) close.closest("dialog").close();
  });
  // click on the backdrop closes: the target is the <dialog> itself only when the click landed outside its
  // children (the .dialog has no padding). Not a geometry test — a click that resizes the dialog (tab switch,
  // step change) would otherwise measure against the NEW box and close it (found by the Codex trial, 1b).
  $$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));

  // ---- menu --------------------------------------------------------------------------------------
  let openMenu = null;
  function closeMenu() {
    if (!openMenu) return;
    openMenu.menu.hidden = true;
    openMenu.button.setAttribute("aria-expanded", "false");
    openMenu = null;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-kit-menu]");
    if (b) {
      const m = $(b.getAttribute("data-kit-menu"));
      if (!m) return;
      if (openMenu && openMenu.menu === m) return closeMenu();
      closeMenu();
      m.hidden = false;
      b.setAttribute("aria-expanded", "true");
      // position under the button; flip above when it would overflow the bottom, align right when it would
      // overflow the right edge — the popup is sized by its content, never clipped by the viewport
      const r = b.getBoundingClientRect();
      m.style.position = "fixed";
      const w = m.offsetWidth, h = m.offsetHeight;
      const below = r.bottom + 4 + h <= window.innerHeight - 8 || r.top - 4 - h < 8;
      m.style.top = (below ? r.bottom + 4 : r.top - 4 - h) + "px";
      m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + "px";
      m.style.maxHeight = "calc(100vh - 16px)";
      openMenu = { menu: m, button: b };
      ($(".menu-item, input, button, select, textarea", m) || m).focus?.();
      return;
    }
    if (openMenu && !e.target.closest(".menu, .popover")) closeMenu();
    else if (openMenu && e.target.closest(".menu-item, [data-kit-close]")) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeMenu();
    $$(".drawer[data-open]").forEach(closeDrawer);
  });

  // ---- segmented toggle --------------------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-kit-seg] > button");
    if (!b) return;
    $$("button", b.parentElement).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    b.parentElement.dispatchEvent(new CustomEvent("kit:seg", { detail: b.value ?? b.textContent.trim(), bubbles: true }));
  });

  window.kit = { closeMenu, closeDrawer };
})();
