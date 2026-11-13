/* =========================================================
   i18n.js — moteur bilingue FR / EN (sans dépendance)
   ---------------------------------------------------------
   • Le français est écrit directement dans le HTML (source).
   • Chaque page fournit un dictionnaire { "texte FR": "texte EN" }.
   • Au chargement, le moteur repère les blocs de texte du DOM,
     mémorise la version FR et peut basculer à volonté.
   • Langue choisie : ?lang=en|fr  >  choix mémorisé  >  langue du navigateur.
   • Les scripts de la page utilisent I18N.t("fr", "en") pour leurs
     textes dynamiques et écoutent l'événement "langchange".
   ========================================================= */
(function () {
  const norm = s => s.replace(/\s+/g, " ").trim();
  const SKIP = new Set(["SCRIPT", "STYLE", "svg", "SVG", "CANVAS", "KBD", "CODE", "TEXTAREA", "INPUT"]);
  const hasDirectText = el => [...el.childNodes].some(n => n.nodeType === 3 && norm(n.data));
  const entries = [];   // blocs traduisibles trouvés dans la page
  let dict = {}, meta = {}, lang = "fr";

  /* Parcourt le DOM et associe chaque bloc de texte à sa traduction */
  function collect(root) {
    const walk = el => {
      if (SKIP.has(el.tagName) || el.hasAttribute("data-no-i18n")) return;
      if (el.tagName === "PRE") {            // dans le code, on ne traduit que les commentaires
        el.querySelectorAll(".c").forEach(c => { const en = dict[norm(c.textContent)]; if (en) entries.push({ node: c.firstChild, fr: c.firstChild.data, en }); });
        return;
      }
      if (hasDirectText(el) && !(el.parentElement && hasDirectText(el.parentElement))) {
        if (el.querySelector("svg")) {       // bouton avec icône : on ne touche qu'au texte
          [...el.childNodes].filter(n => n.nodeType === 3 && norm(n.data)).forEach(n => {
            const en = dict[norm(n.data)];
            if (en) entries.push({ node: n, fr: n.data, en: n.data.replace(norm(n.data), en) });
          });
        } else {
          const en = dict[norm(el.innerHTML)];
          if (en) entries.push({ el, fr: el.innerHTML, en });
        }
        return;
      }
      [...el.children].forEach(walk);
    };
    walk(root);
    // attributs accessibles (aria-label, alt, title)
    root.querySelectorAll("[aria-label],[alt],[title]").forEach(el => ["aria-label", "alt", "title"].forEach(a => {
      const v = el.getAttribute(a); if (v && dict[norm(v)]) entries.push({ el, attr: a, fr: v, en: dict[norm(v)] });
    }));
  }

  function apply(next) {
    lang = next === "en" ? "en" : "fr";
    entries.forEach(e => {
      const v = e[lang];
      if (e.node) e.node.data = v;
      else if (e.attr) e.el.setAttribute(e.attr, v);
      else e.el.innerHTML = v;
    });
    document.documentElement.lang = lang;
    if (meta.title) document.title = meta.title[lang];
    if (meta.description) { const m = document.querySelector('meta[name="description"]'); if (m) m.content = meta.description[lang]; }
    document.querySelectorAll("[data-lang-btn]").forEach(b => {
      const on = b.dataset.langBtn === lang;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
    try { localStorage.setItem("hnt-lang", lang); } catch {}
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  function detect() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "fr") return q;
    try { const s = localStorage.getItem("hnt-lang"); if (s) return s; } catch {}
    return (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
  }

  window.I18N = {
    init(d, m = {}) {
      dict = {}; Object.keys(d).forEach(k => dict[norm(k)] = d[k]); meta = m;
      collect(document.body);
      document.querySelectorAll("[data-lang-btn]").forEach(b => b.addEventListener("click", () => apply(b.dataset.langBtn)));
      apply(detect());
    },
    set: apply,
    get lang() { return lang; },
    t: (fr, en) => (lang === "en" ? en : fr),
  };
})();
