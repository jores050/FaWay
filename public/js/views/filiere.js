// =============================================================================
// views/filiere.js — Détail d'une filière
// -----------------------------------------------------------------------------
// Affiche TOUTES les colonnes de `filieres` + la liste BRUTE des
// criteres_classement (série + matière, telles qu'en base) + la page source.
// Une seule université en base (UAC) : on l'affiche en bandeau, sans sélecteur.
// =============================================================================

import { chargerFiliere } from "../data/queries.js";
import { splitDebouches } from "../engine/filtrage.js";
import { extraireSimgle, deduireVille, deduireNiveau, deduireDuree } from "../lib/etabMeta.js";
import {
  el,
  ico,
  monter,
  chargement,
  boiteErreur,
  encartAvertissement,
  encartInfo,
  badgeRisqueIA,
  ouTiret,
} from "../ui.js";

export async function render(mount, params) {
  monter(mount, chargement("Chargement de la filière…"));

  let data;
  try {
    data = await chargerFiliere(params.id);
  } catch (e) {
    monter(
      mount,
      boiteErreur(e.message, e.cause && e.cause.message),
      el("p", {}, el("a", { class: "btn btn--ghost", href: "#/resultats" }, "← Résultats"))
    );
    return;
  }

  const { filiere: f, etablissement, universite, criteres, metiers } = data;
  const debouches = splitDebouches(f.debouches);

  // Valeurs déduites (null si non déductible → ligne masquée par kv()).
  const siggleEtab = etablissement?.sigle ?? extraireSimgle(etablissement?.nom ?? "");
  const villeEtab  = etablissement?.ville ?? deduireVille(etablissement?.nom, siggleEtab);
  const niveauEff  = f.niveau ?? deduireNiveau(etablissement?.nom, siggleEtab, f.intitule);
  const dureeEff   = f.duree_annees != null ? String(f.duree_annees) : deduireDuree(niveauEff);

  monter(
    mount,
    el("a", { class: "btn btn--ghost", href: "#/resultats" }, "← Résultats"),
    el(
      "section",
      { class: "card stack", style: "margin-top:.8rem" },
      el("h1", { style: "margin-bottom:.15rem" }, f.intitule || "Filière"),
      f.sigle ? el("p", { class: "muted", style: "margin:0" }, f.sigle) : null,

      // Bandeau université (UAC seule en base).
      universite
        ? el(
            "p",
            { class: "muted" },
            ico("landmark"),
            " ",
            universite.nom,
            universite.sigle ? ` (${universite.sigle})` : "",
            etablissement ? ` — ${etablissement.nom}` : ""
          )
        : null,

      // Informations filière — null = ligne masquée (pas de "—" jamais).
      kv([
        ["Niveau", niveauEff],
        ["Durée", dureeEff],
        ["Diplôme délivré", f.diplome_delivre],
        ["Mode d'entrée", f.mode_entree],
        ["Description", f.description],
        ["Page source (guide)", f.source_page != null ? String(f.source_page) : null],
      ]),

      // Quotas — données de référence, jamais une garantie.
      el("h2", {}, "Places (données de référence)"),
      encartAvertissement(
        "Chiffres de l'année du guide. Ils ne garantissent pas ton statut : le ",
        "seuil réel dépend du classement national de l'année."
      ),
      kv([
        ["Places boursières", f.quota_boursiers != null ? String(f.quota_boursiers) : null],
        ["Places payantes", f.quota_payant != null ? String(f.quota_payant) : null],
        ["Places entièrement payantes", f.quota_entierement_payant != null ? String(f.quota_entierement_payant) : null],
      ]),

      // Établissement.
      etablissement
        ? el(
            "div",
            {},
            el("h2", {}, "Établissement"),
            kv([
              ["Nom", etablissement.nom],
              ["Sigle", siggleEtab],
              ["Ville", villeEtab],
            ])
          )
        : null,

      // Critères de classement BRUTS (série + matière telles qu'en base).
      el("h2", {}, "Critères de classement"),
      encartAvertissement(
        "Le guide ne publie aucun coefficient chiffré : aucune moyenne pondérée ",
        "« officielle » n'est calculable. Les matières sont affichées telles quelles."
      ),
      criteres.length === 0
        ? el(
            "p",
            { class: "muted" },
            "Aucun critère listé — filière ouverte à toutes séries."
          )
        : tableCriteres(criteres),

      // Débouchés + risque IA (liste structurée), avec repli sur le texte brut.
      blocDebouches(metiers, debouches)
    )
  );
}

/**
 * Bloc débouchés : liste structurée des métiers + badge risque IA (triée du plus
 * sûr au plus exposé). Repli sur `debouches` texte brut si aucune liaison
 * `filieres_metiers` (jamais d'écran vide). Certains métiers n'ont pas de score.
 */
function blocDebouches(metiers, debouchesTexte) {
  // Repli : aucune liaison structurée -> on garde l'affichage texte d'origine.
  if (!metiers || metiers.length === 0) {
    if (!debouchesTexte.length) return null;
    return el(
      "div",
      {},
      el("h2", {}, "Débouchés"),
      el("ul", { class: "list" }, debouchesTexte.map((d) => el("li", {}, d)))
    );
  }

  const source =
    (metiers.find((m) => m.source) || {}).source ||
    "Estimation qualitative par famille de métiers (tendances WEF Future of Jobs et O*NET).";

  return el(
    "div",
    {},
    el("h2", {}, "Débouchés & risque d'automatisation IA"),
    encartInfo(
      "Niveaux de risque IA = estimations ",
      el("strong", {}, "qualitatives par famille de métiers"),
      " (pas une mesure pour ce métier précis ni pour le contexte béninois). ",
      "Triés du plus sûr au plus exposé ; survole un badge pour la justification. ",
      el("span", { class: "muted" }, "Source : " + source)
    ),
    el(
      "div",
      { class: "metiers-ia" },
      metiers.map((m) =>
        el(
          "div",
          { class: "metier-ia" },
          el("span", { class: "metier-ia__nom" }, m.nom),
          badgeRisqueIA(m.score, {
            titre:
              m.justification ||
              "Métier non rattaché à une famille évaluée — risque d'automatisation non estimé.",
          })
        )
      )
    )
  );
}

/** Construit une liste clé/valeur. Les paires avec valeur null/undefined sont masquées. */
function kv(paires) {
  const visibles = paires.filter(([, v]) => v != null && v !== "");
  if (!visibles.length) return null;
  return el(
    "div",
    { class: "kv" },
    visibles.map(([k, v]) =>
      el(
        "div",
        { class: "kv__row" },
        el("span", { class: "kv__k" }, k),
        el("span", { class: "kv__v" }, v)
      )
    )
  );
}

/** Tableau des critères de classement (texte BRUT). */
function tableCriteres(criteres) {
  return el(
    "table",
    { class: "criteres-table" },
    el(
      "thead",
      {},
      el("tr", {}, el("th", {}, "Série(s)"), el("th", {}, "Matière"))
    ),
    el(
      "tbody",
      {},
      criteres.map((c) =>
        el(
          "tr",
          {},
          el("td", {}, ouTiret(c.serie_bac)),
          el("td", {}, ouTiret(c.matiere))
        )
      )
    )
  );
}
