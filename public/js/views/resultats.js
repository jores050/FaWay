// =============================================================================
// views/resultats.js — Liste des filières éligibles, classées par score composite
// -----------------------------------------------------------------------------
// Ordre de traitement :
//   1. Couche 1 (déterministe) : filtrer() sur série + notes.
//   2. Similarité sémantique via Edge Function (si aspiration saisie).
//   3. Score composite sur chaque résultat (affinité + marge + IA + geo + financier).
//   4. Tri unique par score composite décroissant.
// =============================================================================

import { chargerDonnees } from "../data/queries.js";
import { classerParSemantique } from "../data/semantique.js";
import { filtrer, splitDebouches } from "../engine/filtrage.js";
import { calculerScoreComposite } from "../engine/scoring.js";
import { lireEtat } from "../store.js";
import {
  el,
  monter,
  chargement,
  boiteErreur,
  badge,
  badgeRisqueIA,
  encartInfo,
  disclaimerEstimation,
  ouTiret,
} from "../ui.js";
import { naviguer } from "../router.js";

export async function render(mount) {
  const etat = lireEtat();
  if (!etat.serie) {
    naviguer("#/etape1");
    return;
  }

  monter(mount, chargement("Recherche des filières…"));

  let donnees;
  try {
    donnees = await chargerDonnees();
  } catch (e) {
    monter(mount, boiteErreur(e.message, e.cause && e.cause.message));
    return;
  }

  // ── Couche 1 : éligibilité déterministe (série + notes) ──────────────────
  let { resultats, infoAspiration } = filtrer(donnees, etat);

  // ── Couche 2 : similarité sémantique (si aspiration saisie) ──────────────
  // L'embedding de l'aspiration est calculé une seule fois côté serveur.
  // Fallback silencieux si Edge Function indisponible / timeout / aspiration vide.
  const simMap = new Map();
  let triSemantique = false;
  if (etat.aspiration && etat.aspiration.trim()) {
    const ranking = await classerParSemantique(
      etat.aspiration,
      resultats.map((r) => r.filiere.id)
    );
    if (ranking.length) {
      for (const x of ranking) simMap.set(x.filiere_id, x.similarite);
      triSemantique = true;
    }
  }

  // ── Couche 3 : score composite + tri unique ───────────────────────────────
  const poids = donnees.poids;
  for (const r of resultats) {
    const sim = simMap.get(r.filiere.id) ?? null;
    const { score, detail } = calculerScoreComposite(r, sim, poids);
    r.scoreComposite = score;
    r.scoreDetail = detail;
    r.similariteSemantique = sim;
  }
  resultats.sort((a, b) => b.scoreComposite - a.scoreComposite);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const aUneEstimation = resultats.some((r) => r.moyenne.statut === "estimee");

  const entete = el(
    "div",
    { class: "stack" },
    el(
      "div",
      { class: "actions actions--between" },
      el(
        "h1",
        { style: "margin:0" },
        `${resultats.length} filière${resultats.length > 1 ? "s" : ""}`
      ),
      el("a", { class: "btn btn--ghost", href: "#/etape1" }, "Modifier")
    ),
    el(
      "p",
      { class: "muted", style: "margin:0" },
      "Série ",
      el("strong", {}, etat.serie),
      " · classées par score composite."
    )
  );

  const notices = [];
  if (triSemantique) {
    notices.push(
      encartInfo(
        "Aspiration « ",
        el("strong", {}, etat.aspiration.trim()),
        " » prise en compte dans le score. L'éligibilité (série, notes) reste prioritaire."
      )
    );
  } else if (infoAspiration && infoAspiration.actif) {
    notices.push(
      encartInfo(
        "Aspiration analysée (",
        el("strong", {}, infoAspiration.mots.join(", ")),
        `) — ${infoAspiration.nbPertinentes} filière${infoAspiration.nbPertinentes > 1 ? "s" : ""} en correspondance lexicale intégrées dans le score.`
      )
    );
  }
  if (aUneEstimation) notices.push(disclaimerEstimation());

  const liste =
    resultats.length === 0
      ? encartInfo(
          "Aucune filière trouvée pour la série « ",
          el("strong", {}, etat.serie),
          " ». Reviens en arrière pour changer de série."
        )
      : el("div", {}, resultats.map((r) => carteFiliere(r)));

  monter(mount, el("section", { class: "stack" }, entete, ...notices, liste));
}

/** Carte d'une filière (cliquable vers le détail). */
function carteFiliere(r) {
  const f = r.filiere;
  const etab = r.etablissement;
  const modeEntree = f.mode_entree || "Non précisé";
  const debouches = splitDebouches(f.debouches).slice(0, 3);
  const pct = Math.round((r.scoreComposite ?? 0) * 100);

  return el(
    "a",
    { class: "card result", href: `#/filiere/${encodeURIComponent(f.id)}` },

    // Barre de score composite (en haut de la carte)
    el(
      "div",
      { class: "score-bar-wrap", title: `Score composite : ${pct}%` },
      el("div", { class: "score-bar", style: `width:${pct}%` })
    ),

    el(
      "div",
      { class: "result__top" },
      el("h2", { class: "result__title" }, f.intitule || "Filière"),
      el(
        "span",
        { class: "score-label", title: "Score composite (affinité + notes + résistance IA + accessibilité)" },
        `${pct}%`
      )
    ),

    etab
      ? el(
          "p",
          { class: "result__etab" },
          etab.nom,
          etab.ville ? ` · ${etab.ville}` : ""
        )
      : null,

    // Mode d'entrée
    el("div", { class: "result__meta" }, badge(modeEntree, modeEntreeVariante(f.mode_entree))),

    // Badge "ouverte à toutes séries"
    r.eligibiliteType === "toutesSeries"
      ? el("div", { class: "result__meta" }, badge("Ouverte à toutes séries", "badge--accent"))
      : null,

    // Affinité aspiration (sémantique ou lexique)
    r.similariteSemantique != null || r.scoreAspiration > 0
      ? el(
          "div",
          { class: "result__meta" },
          badge("✓ correspond à ton aspiration", "badge--accent")
        )
      : null,

    // Badge risque IA (display-only)
    r.risqueIAmin != null
      ? el(
          "div",
          { class: "result__meta" },
          badgeRisqueIA(r.risqueIAmin, {
            court: true,
            titre:
              "Niveau du métier débouché le plus à l'abri de l'automatisation. Estimation qualitative par famille de métiers (tendances WEF / O*NET), pas un score individuel.",
          })
        )
      : null,

    // Quotas
    el(
      "p",
      { class: "result__meta", style: "display:block;margin-top:.5rem" },
      el("span", { class: "muted" }, "Places (référence) — "),
      `boursiers : ${ouTiret(f.quota_boursiers)} · payant : ${ouTiret(f.quota_payant)}`,
      el("span", { class: "muted" }, " (peut varier selon l'année)")
    ),

    blocMoyenne(r.moyenne),

    debouches.length
      ? el(
          "p",
          { class: "result__debouches" },
          el("strong", {}, "Débouchés : "),
          debouches.join(" · "),
          splitDebouches(f.debouches).length > 3 ? " …" : ""
        )
      : null
  );
}

/** Rendu du bloc moyenne selon le statut de l'estimation. */
function blocMoyenne(moyenne) {
  switch (moyenne.statut) {
    case "estimee":
      return el(
        "p",
        { class: "result__meta", style: "display:block;margin-top:.4rem" },
        badge(`Moyenne estimée : ${moyenne.valeur.toFixed(2)}/20`, "badge--primary"),
        el(
          "span",
          { class: "muted", style: "display:block;font-size:.8rem;margin-top:.25rem" },
          "non pondérée · calculée sur : ",
          moyenne.utilisees.join(", ")
        )
      );
    case "incomplete":
      return el(
        "p",
        { class: "muted", style: "margin-top:.4rem;font-size:.85rem" },
        "Données insuffisantes pour estimer (il manque : ",
        moyenne.manquantes.join(", "),
        ")."
      );
    case "concours":
      return el(
        "p",
        { class: "result__meta", style: "display:block;margin-top:.4rem" },
        badge("Admission sur concours", "badge--neutral"),
        moyenne.epreuves && moyenne.epreuves.length
          ? el(
              "span",
              { class: "muted", style: "display:block;font-size:.8rem;margin-top:.25rem" },
              "épreuves : ",
              moyenne.epreuves.join(", ")
            )
          : null
      );
    case "sansMatiere":
      return el(
        "p",
        { class: "muted", style: "margin-top:.4rem;font-size:.85rem" },
        "Pas de matière de sélection précisée pour cette filière."
      );
    case "nonClassement":
    case "nonSaisi":
    default:
      return null;
  }
}

function modeEntreeVariante(mode) {
  if (mode === "Concours") return "badge--neutral";
  if (mode === "Classement") return "badge--primary";
  return "";
}
