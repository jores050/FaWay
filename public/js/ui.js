// =============================================================================
// ui.js — Helpers de rendu DOM + composants partagés
// -----------------------------------------------------------------------------
// On construit le DOM via `el()` (textContent par défaut) plutôt que innerHTML :
// les textes issus de la base (intitulé, débouchés, matières) sont insérés en
// toute sécurité, sans risque d'injection.
// =============================================================================

/**
 * Crée un élément DOM.
 * @param {string} tag
 * @param {object} [props]  class, id, attributs, on<Event> (fonctions), dataset, html (opt-in)
 * @param {...(Node|string|null|Array)} children
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "html") node.innerHTML = v; // usage interne, contenu de confiance
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  ajouterEnfants(node, children);
  return node;
}

function ajouterEnfants(node, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) ajouterEnfants(node, c);
    else if (c instanceof Node) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }
}

/** Vide un conteneur puis y monte les nœuds fournis. */
export function monter(parent, ...nodes) {
  parent.innerHTML = "";
  ajouterEnfants(parent, nodes);
  return parent;
}

// --- Composants partagés -----------------------------------------------------

/** Bouton-lien interne qui navigue via le hash. */
export function lienBouton(libelle, hash, classe = "btn") {
  return el("a", { class: classe, href: hash }, libelle);
}

/** Disclaimer OBLIGATOIRE pour toute moyenne estimée (coefficients inconnus). */
export function disclaimerEstimation() {
  return el(
    "p",
    { class: "disclaimer" },
    "Estimation non pondérée — le Ministère ne publie pas les coefficients réels. ",
    "Renseigne-toi sur la plateforme officielle d'inscription pour les coefficients exacts."
  );
}

/** Encart d'avertissement générique (jaune). */
export function encartAvertissement(...contenu) {
  return el("div", { class: "note note--warn" }, ...contenu);
}

/** Encart d'information (bleu). */
export function encartInfo(...contenu) {
  return el("div", { class: "note note--info" }, ...contenu);
}

/** Boîte d'erreur lisible (rouge). */
export function boiteErreur(message, details) {
  return el(
    "div",
    { class: "note note--error" },
    el("strong", {}, "Une erreur est survenue. "),
    el("span", {}, message || "Réessaie dans un instant."),
    details ? el("p", { class: "note__details" }, details) : null
  );
}

/** Indicateur de chargement. */
export function chargement(texte = "Chargement…") {
  return el("div", { class: "loader" }, el("span", { class: "loader__spin" }), texte);
}

/** Badge coloré (étiquette courte). */
export function badge(texte, variante = "") {
  return el("span", { class: `badge ${variante}`.trim() }, texte);
}

/**
 * Niveau de risque IA à partir d'un score (ou null = non évalué).
 * Paliers cohérents avec la distribution réelle : ≤30 faible, ≥60 élevé, sinon moyen.
 */
export function niveauRisqueIA(score) {
  if (score === null || score === undefined)
    return { cle: "na", libelle: "Non évalué", variante: "badge--neutral" };
  if (score <= 30) return { cle: "faible", libelle: "Risque IA faible", variante: "badge--risk-low" };
  if (score >= 60) return { cle: "eleve", libelle: "Risque IA élevé", variante: "badge--risk-high" };
  return { cle: "moyen", libelle: "Risque IA moyen", variante: "badge--risk-mid" };
}

/**
 * Badge de risque IA. `court` => forme compacte ("IA faible") pour la liste.
 * `titre` => texte affiché au survol (justification + nature qualitative).
 * Un score absent (métier "Autre") donne un badge gris "Non évalué", jamais d'erreur.
 */
export function badgeRisqueIA(score, { court = false, titre = null } = {}) {
  const n = niveauRisqueIA(score);
  const libelle = court ? n.libelle.replace("Risque IA ", "IA ") : n.libelle;
  const b = badge(libelle, n.variante);
  if (titre) b.setAttribute("title", titre);
  return b;
}

/** Barre d'étapes 1-2-3 du wizard. */
export function stepper(etapeActive) {
  const etapes = [
    { n: 1, libelle: "Série" },
    { n: 2, libelle: "Notes" },
    { n: 3, libelle: "Aspiration" },
  ];
  return el(
    "ol",
    { class: "stepper", "aria-label": "Progression" },
    etapes.map((e) =>
      el(
        "li",
        {
          class:
            "stepper__item" +
            (e.n === etapeActive ? " is-active" : "") +
            (e.n < etapeActive ? " is-done" : ""),
        },
        el("span", { class: "stepper__num" }, String(e.n)),
        el("span", { class: "stepper__lbl" }, e.libelle)
      )
    )
  );
}

/** Affiche une valeur ou un tiret si absente (NULL en base). */
export function ouTiret(v) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

// SVG paths Lucide (24×24, stroke="currentColor", fill="none", sw=2, round caps/joins).
const ICO_PATHS = {
  // Icônes existantes (header, landing, filière)
  "graduation-cap": `<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`,
  target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
  calculator: `<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="14" y1="18" x2="16" y2="18"/>`,
  "file-text": `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>`,
  landmark: `<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>`,
  // Icônes domaines (étape 3)
  heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  monitor: `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`,
  wrench: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  leaf: `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>`,
  "book-open": `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3-3h7z"/>`,
  "shopping-bag": `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
  scale: `<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21H17"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>`,
  music: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
  "building-2": `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`,
  "map-pin": `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  "trending-up": `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,
  zap: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  bookmark: `<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>`,
};

/**
 * Crée une icône SVG Lucide.
 * @param {string} name  Clé dans ICO_PATHS (ex. "graduation-cap")
 * @param {number} [size=20]
 */
export function ico(name, size = 20) {
  const paths = ICO_PATHS[name] || "";
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("width", size);
  node.setAttribute("height", size);
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", "2");
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  node.setAttribute("aria-hidden", "true");
  node.innerHTML = paths;
  return node;
}
