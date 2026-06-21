// =============================================================================
// views/filiere.js — Détail d'une filière
// -----------------------------------------------------------------------------
// Affiche TOUTES les colonnes de `filieres` + la liste BRUTE des
// criteres_classement (série + matière, telles qu'en base) + la page source.
// Une seule université en base (UAC) : on l'affiche en bandeau, sans sélecteur.
// =============================================================================

import { chargerFiliere } from "../data/queries.js";
import { splitDebouches } from "../engine/filtrage.js";
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

      // Toutes les colonnes de la filière.
      kv([
        ["Niveau", ouTiret(f.niveau)],
        ["Durée (années)", ouTiret(f.duree_annees)],
        ["Diplôme délivré", ouTiret(f.diplome_delivre)],
        ["Mode d'entrée", f.mode_entree || "Non précisé"],
        ["Description", ouTiret(f.description)],
        ["Page source (guide)", ouTiret(f.source_page)],
      ]),

      // Quotas — données de référence, jamais une garantie.
      el("h2", {}, "Places (données de référence)"),
      encartAvertissement(
        "Chiffres de l'année du guide. Ils ne garantissent pas ton statut : le ",
        "seuil réel dépend du classement national de l'année."
      ),
      kv([
        ["Places boursières", ouTiret(f.quota_boursiers)],
        ["Places payantes", ouTiret(f.quota_payant)],
        ["Places entièrement payantes", ouTiret(f.quota_entierement_payant)],
      ]),

      // Établissement.
      etablissement
        ? el(
            "div",
            {},
            el("h2", {}, "Établissement"),
            kv([
              ["Nom", ouTiret(etablissement.nom)],
              ["Sigle", ouTiret(etablissement.sigle)],
              ["Type", ouTiret(etablissement.type)],
              ["Ville", ouTiret(etablissement.ville)],
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

/** Construit une liste clé/valeur. */
function kv(paires) {
  return el(
    "div",
    { class: "kv" },
    paires.map(([k, v]) =>
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
