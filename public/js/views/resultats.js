// =============================================================================
// views/resultats.js — Liste des filières éligibles, classées par score composite
// -----------------------------------------------------------------------------
// Pipeline de traitement :
//   1. Couche 1 (déterministe) : filtrer() sur série + notes.
//   2. Groupage domaine (si sélection) : filieres_par_domaines() RPC.
//   3. Similarité sémantique via embed-match (si aspiration saisie).
//      → Appelée UNIQUEMENT sur les filières "dans tes domaines" si domaines sélectionnés.
//      → Zéro appel Gemini si aspiration vide.
//   4. Score composite + tri indépendant dans chaque groupe.
// =============================================================================

import { chargerDonnees, appellerFiliereParDomaines } from "../data/queries.js";
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
  const eligibleIds = resultats.map((r) => r.filiere.id);

  // ── Couche 2 : groupage par domaine ──────────────────────────────────────
  const domaineIds = Array.isArray(etat.domaines) ? etat.domaines : [];
  let correspondanceMap = null; // Map<filiere_id, boolean> ou null si pas de groupage
  if (domaineIds.length > 0) {
    const rows = await appellerFiliereParDomaines(eligibleIds, domaineIds);
    if (rows.length > 0) {
      correspondanceMap = new Map(rows.map((r) => [r.filiere_id, r.correspond_domaine]));
      for (const r of resultats) {
        r.correspondDomaine = correspondanceMap.get(r.filiere.id) ?? false;
      }
    }
  }

  // ── Couche 3 : similarité sémantique (si aspiration saisie) ──────────────
  const aspTrim = (etat.aspiration || "").trim();
  const simMap = new Map();
  let triSemantique = false;
  if (aspTrim) {
    // Si domaines sélectionnés : reranking seulement sur les filières correspondantes
    const idsASemantiser = correspondanceMap
      ? resultats.filter((r) => r.correspondDomaine).map((r) => r.filiere.id)
      : eligibleIds;
    if (idsASemantiser.length > 0) {
      const ranking = await classerParSemantique(aspTrim, idsASemantiser);
      if (ranking.length) {
        for (const x of ranking) simMap.set(x.filiere_id, x.similarite);
        triSemantique = true;
      }
    }
  }

  // ── Couche 4 : score composite ────────────────────────────────────────────
  const poids = donnees.poids;
  for (const r of resultats) {
    const sim = simMap.get(r.filiere.id) ?? null;
    const { score } = calculerScoreComposite(r, sim, poids);
    r.scoreComposite = score;
    r.similariteSemantique = sim;
  }

  // ── Séparation en groupes + tri ───────────────────────────────────────────
  let dansLesDomaines = null;
  let autresFilières = resultats;
  if (correspondanceMap) {
    dansLesDomaines = resultats
      .filter((r) => r.correspondDomaine)
      .sort((a, b) => b.scoreComposite - a.scoreComposite);
    autresFilières = resultats
      .filter((r) => !r.correspondDomaine)
      .sort((a, b) => b.scoreComposite - a.scoreComposite);
  } else {
    autresFilières = [...resultats].sort((a, b) => b.scoreComposite - a.scoreComposite);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const aUneEstimation = resultats.some((r) => r.moyenne.statut === "estimee");

  const entete = el(
    "div",
    { class: "stack" },
    el(
      "div",
      { class: "actions actions--between" },
      el("h1", { style: "margin:0" }, `${resultats.length} filière${resultats.length > 1 ? "s" : ""}`),
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
        el("strong", {}, aspTrim),
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

  // Construction de la liste (groupée ou plate)
  let liste;
  if (resultats.length === 0) {
    liste = encartInfo(
      "Aucune filière trouvée pour la série « ",
      el("strong", {}, etat.serie),
      " ». Reviens en arrière pour changer de série."
    );
  } else if (dansLesDomaines !== null) {
    // Affichage groupé
    if (dansLesDomaines.length === 0) {
      // Aucune correspondance dans les domaines → affichage flat avec notice
      notices.push(
        encartInfo(
          "Aucune filière associée aux domaines sélectionnés dans la base — toutes les filières éligibles sont affichées."
        )
      );
      liste = el("div", {}, autresFilières.map((r) => carteFiliere(r)));
    } else {
      const sectionDomaines = el(
        "div",
        { class: "stack" },
        el("p", { class: "resultats-groupe-titre" }, `Filières dans tes domaines (${dansLesDomaines.length})`),
        ...dansLesDomaines.map((r) => carteFiliere(r))
      );

      const sectionAutres =
        autresFilières.length > 0
          ? el(
              "details",
              { class: "autres-filieres-details" },
              el(
                "summary",
                { class: "resultats-groupe-titre resultats-groupe-titre--autre" },
                `Autres filières accessibles (${autresFilières.length})`
              ),
              ...autresFilières.map((r) => carteFiliere(r))
            )
          : null;

      liste = el("div", {}, sectionDomaines, sectionAutres);
    }
  } else {
    // Affichage plat (aucun domaine sélectionné — comportement identique à l'ancien flow)
    liste = el("div", {}, autresFilières.map((r) => carteFiliere(r)));
  }

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
      ? el("p", { class: "result__etab" }, etab.nom, etab.ville ? ` · ${etab.ville}` : "")
      : null,

    el("div", { class: "result__meta" }, badge(modeEntree, modeEntreeVariante(f.mode_entree))),

    r.eligibiliteType === "toutesSeries"
      ? el("div", { class: "result__meta" }, badge("Ouverte à toutes séries", "badge--accent"))
      : null,

    r.similariteSemantique != null || r.scoreAspiration > 0
      ? el("div", { class: "result__meta" }, badge("✓ correspond à ton aspiration", "badge--accent"))
      : null,

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
