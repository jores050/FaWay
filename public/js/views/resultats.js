// =============================================================================
// views/resultats.js — Résultats en 3 filtres distincts
// -----------------------------------------------------------------------------
// Pipeline de traitement identique (couches 1-5), mais l'affichage est
// réorganisé en 3 sections indépendantes :
//   Filtre 1 — meilleure affinité sémantique (aspiration)
//   Filtre 2 — meilleures chances d'admission (moyenne vs seuil)
//   Filtre 3 — meilleur score composite (équilibre de tous les critères)
//
// Règle : une carte n'affiche JAMAIS deux pourcentages concurrents sur le même
// plan visuel. L'adéquation académique est montrée en X/20, pas en %.
// =============================================================================

import { chargerDonnees, appellerFiliereParDomaines } from "../data/queries.js";
import { classerParSemantique } from "../data/semantique.js";
import { genererJustifications, extraireAspiration } from "../data/justifications.js";
import { genererImagePartage, partagerResultats } from "../data/partage.js";
import { filtrer, splitDebouches } from "../engine/filtrage.js";
import { calculerScoreComposite } from "../engine/scoring.js";
import { calculerChancesAdmission } from "../lib/seuilsAdmission.js";
import { evaluerConditionMoyenneBac } from "../lib/conditionsBac.js";
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
  let correspondanceMap = null;
  if (domaineIds.length > 0) {
    const rows = await appellerFiliereParDomaines(eligibleIds, domaineIds);
    if (rows.length > 0) {
      correspondanceMap = new Map(rows.map((r) => [r.filiere_id, r.correspond_domaine]));
      for (const r of resultats) {
        r.correspondDomaine = correspondanceMap.get(r.filiere.id) ?? false;
      }
    }
  }

  // ── Couche 2.5 : extraction veut/rejette depuis l'aspiration ────────────
  const aspTrim = (etat.aspiration || "").trim();
  let aspirationStructuree = { veut: [], rejette: [] };
  if (aspTrim) {
    aspirationStructuree = await extraireAspiration(aspTrim);
  }

  // ── Couche 3 : similarité sémantique (si aspiration saisie) ─────────────
  const simMap = new Map();
  let triSemantique = false;
  if (aspTrim) {
    const texteEmbedding = aspirationStructuree.veut.length > 0
      ? aspirationStructuree.veut.join(", ")
      : aspTrim;
    const idsASemantiser = correspondanceMap
      ? resultats.filter((r) => r.correspondDomaine).map((r) => r.filiere.id)
      : eligibleIds;
    if (idsASemantiser.length > 0) {
      const ranking = await classerParSemantique(texteEmbedding, idsASemantiser);
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
    const metiersFiliere = donnees.metiersParFiliere?.get(r.filiere.id) || [];
    const { score, detail, rejetDetecte } = calculerScoreComposite(r, sim, poids, {
      rejette: aspirationStructuree.rejette,
      metiersFiliere,
      debouches: r.filiere.debouches || "",
      seuils: donnees.seuils,
    });
    r.scoreComposite = score;
    r.scoreDetail    = detail;
    r.rejetDetecte   = rejetDetecte ?? false;
    r.similariteSemantique = sim;
    r.aspirationPrise      = sim !== null;
    r.chancesAdmission     = calculerChancesAdmission(r);
  }

  // ── 3 filtres ─────────────────────────────────────────────────────────────

  // Helpers de tri — valeurs brutes (jamais arrondies) pour éviter les fausses égalités
  const brut  = (r) => r.chancesAdmission?.pourcentageBrut ?? 0;
  const aff   = (r) => r.scoreDetail?.sAffinite ?? 0;
  const fin   = (r) => r.scoreDetail?.sFinancier ?? 0;
  const comp  = (r) => r.scoreComposite ?? 0;

  // Filtre 1 : affinité → chances brutes → accessibilité financière
  const tousF1 = [...resultats].sort((a, b) => {
    const d1 = aff(b) - aff(a); if (d1 !== 0) return d1;
    const d2 = brut(b) - brut(a); if (d2 !== 0) return d2;
    return fin(b) - fin(a);
  });
  const filtre1 = tousF1.slice(0, 3);

  // Filtre 2 : chances brutes → affinité → accessibilité financière
  const tousF2 = [...resultats].sort((a, b) => {
    const aA = a.chancesAdmission?.applicable;
    const bA = b.chancesAdmission?.applicable;
    if (aA && bA) {
      const d1 = brut(b) - brut(a); if (d1 !== 0) return d1;
      const d2 = aff(b) - aff(a);  if (d2 !== 0) return d2;
      return fin(b) - fin(a);
    }
    if (aA) return -1;
    if (bA) return 1;
    return comp(b) - comp(a);
  });
  const filtre2 = tousF2.slice(0, 3);

  // Filtre 3 : score composite → affinité → chances brutes
  const tousF3 = [...resultats].sort((a, b) => {
    const d1 = comp(b) - comp(a); if (d1 !== 0) return d1;
    const d2 = aff(b) - aff(a);  if (d2 !== 0) return d2;
    return brut(b) - brut(a);
  });
  const filtre3 = tousF3.slice(0, 3);

  // Filières présentes dans les 3 filtres → signal fort
  const ids1 = new Set(filtre1.map((r) => r.filiere.id));
  const ids2 = new Set(filtre2.map((r) => r.filiere.id));
  const ids3 = new Set(filtre3.map((r) => r.filiere.id));
  const omnipresents = new Set([...ids1].filter((id) => ids2.has(id) && ids3.has(id)));

  // ── Couche 5 : justifications IA (non-bloquante, top 5 par score) ────────
  const topResultats = filtre3.slice(0, 5);
  const topIds = new Set(topResultats.map((r) => r.filiere.id));
  const justifPromesse = genererJustifications(topResultats, etat, donnees, aspirationStructuree.rejette);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const aUneEstimation = resultats.some((r) => r.moyenne.statut === "estimee");

  const btnPartage = el("button", { class: "btn btn--ghost", type: "button" }, "Partager");
  btnPartage.addEventListener("click", async () => {
    btnPartage.disabled = true;
    btnPartage.textContent = "Génération…";
    try {
      const blob = await genererImagePartage(topResultats, etat.serie);
      await partagerResultats(blob);
    } catch (e) {
      console.warn("[partage]", e?.message ?? e);
    } finally {
      btnPartage.disabled = false;
      btnPartage.textContent = "Partager";
    }
  });

  const entete = el(
    "div",
    { class: "stack" },
    el(
      "div",
      { class: "actions actions--between" },
      el(
        "div",
        {},
        el("h1", { style: "margin:0 0 .15rem" },
          `${resultats.length} filière${resultats.length > 1 ? "s" : ""}`),
        el("p", { class: "muted", style: "margin:0;font-size:.82rem" },
          "Série ", el("strong", {}, etat.serie), " · 3 angles de résultats")
      ),
      el(
        "div",
        { style: "display:flex;gap:.4rem;align-items:center;flex-wrap:wrap" },
        btnPartage,
        el("a", { class: "btn btn--ghost", href: "#/etape1" }, "Modifier")
      )
    )
  );

  const notices = [];
  if (triSemantique) {
    notices.push(
      encartInfo(
        "Aspiration « ",
        el("strong", {}, aspTrim),
        " » prise en compte dans le filtre 1. L'éligibilité reste prioritaire."
      )
    );
  } else if (infoAspiration && infoAspiration.actif) {
    notices.push(
      encartInfo(
        "Aspiration analysée (",
        el("strong", {}, infoAspiration.mots.join(", ")),
        `) — ${infoAspiration.nbPertinentes} filière${infoAspiration.nbPertinentes > 1 ? "s" : ""} en correspondance.`
      )
    );
  }
  if (aUneEstimation) notices.push(disclaimerEstimation());

  // Helper pour construire une section filtre avec "Voir plus / Voir moins"
  function sectionFiltre(titre, desc, top3, tous, mode) {
    if (!top3.length) return null;
    const reste = tous.slice(3);

    const mkCarte = (r) => carteFiliere(r, {
      mode,
      avecSlot:    mode !== "chances" && topIds.has(r.filiere.id),
      moyenneBac:  etat.moyenneBac,
      omnipresent: omnipresents.has(r.filiere.id),
      poids,
    });

    // style.display plutôt que l'attribut hidden : le CSS .filtre-extra { display:flex }
    // écraserait sinon le display:none du user-agent stylesheet.
    const extraDiv = reste.length > 0
      ? el("div", { class: "filtre-extra", style: "display:none" }, ...reste.map(mkCarte))
      : null;

    const btnVoirPlus = reste.length > 0
      ? (() => {
          const label = (n) => `Voir plus (${n} filière${n > 1 ? "s" : ""}) ▾`;
          const btn = el("button", { class: "btn btn--ghost filtre-voir-plus", type: "button" },
            label(reste.length)
          );
          btn.addEventListener("click", () => {
            const isHidden = extraDiv.style.display === "none";
            extraDiv.style.display = isHidden ? "" : "none";
            btn.textContent = isHidden ? "Voir moins ▴" : label(reste.length);
          });
          return btn;
        })()
      : null;

    return el("section", { class: "filtre-section" },
      el("div", { class: "filtre-section__header" },
        el("h2", { class: "filtre-section__titre" }, titre),
        el("p",  { class: "filtre-section__desc" }, desc)
      ),
      ...top3.map(mkCarte),
      extraDiv,
      btnVoirPlus
    );
  }

  let liste;
  if (resultats.length === 0) {
    liste = encartInfo(
      "Aucune filière trouvée pour la série « ",
      el("strong", {}, etat.serie),
      " ». Reviens en arrière pour changer de série."
    );
  } else {
    const s1 = sectionFiltre(
      "Adaptées à ton aspiration",
      "Les 3 filières qui correspondent le mieux à ce que tu décris vouloir faire.",
      filtre1, tousF1, "affinite"
    );
    const s2 = sectionFiltre(
      "Où tu as le plus de chances",
      "Les 3 filières où ta moyenne de classement est la plus compétitive.",
      filtre2, tousF2, "chances"
    );
    const s3 = sectionFiltre(
      "Notre proposition",
      "L'équilibre optimal entre aspiration, chances d'admission, accès financier et avenir des métiers.",
      filtre3, tousF3, "composite"
    );
    liste = el("div", { class: "filtres-container" }, s1, s2, s3);
  }

  const racine = el("section", { class: "stack" }, entete, ...notices, liste);
  monter(mount, racine);

  // Injecter les justifications IA dans leurs slots quand elles arrivent.
  justifPromesse
    .then((justifMap) => {
      for (const [fId, texte] of justifMap) {
        const slot = mount.querySelector(`[data-justif-slot="${fId}"]`);
        if (!slot) continue;
        slot.querySelector(".justification-ia__texte").textContent = texte;
        slot.hidden = false;
      }
    })
    .catch(() => {});
}

// =============================================================================
// Carte filière — 3 niveaux de lecture, 3 modes d'affichage
// mode "affinite"  : met en avant la correspondance sémantique
// mode "chances"   : met en avant les chances d'admission
// mode "composite" : met en avant le score global équilibré
// =============================================================================

function carteFiliere(r, { mode = "composite", avecSlot = false, moyenneBac = null, omnipresent = false, poids = null } = {}) {
  const f        = r.filiere;
  const etab     = r.etablissement;
  const modeEntree = f.mode_entree || "Non précisé";
  const debouches  = splitDebouches(f.debouches);
  const pct        = Math.round((r.scoreComposite ?? 0) * 100);
  const chances    = r.chancesAdmission;

  // ── Conditions moyenne bac ────────────────────────────────────────────────
  const condBac = evaluerConditionMoyenneBac(f, moyenneBac);

  // ── Texte + établissement ─────────────────────────────────────────────────
  const headText = el("div", { class: "result__head-text" },
    el("h2", { class: "result__title" }, f.intitule || "Filière"),
    etab
      ? el("p", { class: "result__etab" }, etab.nom, etab.ville ? ` · ${etab.ville}` : "")
      : null
  );

  // ── Bloc score : différent selon le mode ─────────────────────────────────
  let headScore;
  if (mode === "affinite") {
    const aff = Math.round((r.scoreDetail?.sAffinite ?? 0.5) * 100);
    headScore = el("div", { class: "result__score-block result__score-block--affinite" },
      el("span", { class: "result__score-label" }, "Affinité"),
      el("span", { class: "result__score-val",
        title: "Correspondance sémantique avec ton aspiration" }, `${aff}%`)
    );
  } else if (mode === "chances") {
    if (chances?.applicable) {
      headScore = el("div", { class: "result__score-block result__score-block--chances" },
        el("span", { class: "result__score-label" }, "Chances"),
        el("span", { class: "result__score-val",
          title: "Estimation indicative des chances d'admission — non officielle" }, `${chances.pourcentage}%`)
      );
    } else if (chances?.raison === "concours") {
      // Concours : pas de % (pas de classement), montrer la condition d'accès
      const condTexte = condBac.message || "Épreuve spécifique";
      headScore = el("div", { class: "result__score-block" },
        el("span", { class: "result__score-label" }, "Concours"),
        el("span", { class: "result__score-val result__score-val--neutral",
          title: "Filière sur concours — l'admission ne dépend pas de la moyenne de classement" },
          condTexte)
      );
    } else {
      headScore = el("div", { class: "result__score-block" },
        el("span", { class: "result__score-label" }, "Admission"),
        el("span", { class: "result__score-val result__score-val--neutral" }, "—")
      );
    }
  } else {
    headScore = el("div", { class: "result__score-block" },
      el("span", { class: "result__score-label" }, "Compat."),
      el("span", { class: "result__score-val",
        title: "Score de compatibilité — académique 35% · aspiration 25% · financement 20% · avenir métier 15% · géo 5%" }, `${pct}%`)
    );
  }

  // ── Badges ────────────────────────────────────────────────────────────────
  const badgesEls = [
    badge(modeEntree, modeEntreeVariante(f.mode_entree)),
    condBac.badgePrepa  ? badge(condBac.badgePrepa, "badge--prepa") : null,
    condBac.ineligible  ? badge("Non éligible — seuil non atteint", "badge--error") : null,
    r.eligibiliteType === "toutesSeries" ? badge("Toutes séries", "badge--accent") : null,
    r.rejetDetecte
      ? badge("⚠ débouché non souhaité", "badge--warn")
      : (r.similariteSemantique != null || r.scoreAspiration > 0
          ? badge("✓ aspiration", "badge--accent")
          : null),
    r.risqueIAmin != null
      ? badgeRisqueIA(r.risqueIAmin, {
          court: true,
          titre: "Tendance mondiale d'automatisation des débouchés — indicatif, ne reflète pas forcément l'emploi local au Bénin. Information de contexte, non utilisée dans le score.",
        })
      : null,
    omnipresent ? badge("★ Coche tous tes critères", "badge--omnipresent") : null,
  ].filter(Boolean);

  // ── Niveau 1 : trajectoire et chancesInline selon le mode ────────────────
  // "affinite"  → pas de trajectoire ni chancesInline (aspiration est le focus)
  // "chances"   → trajectoire (zone visuelle) mais PAS chancesInline : le headScore
  //               affiche déjà le %, dupliquer serait redondant
  // "composite" → trajectoire + chancesInline (composite% ≠ chances%, deux infos distinctes)
  const niveau1 = el("div", { class: "result__l1" },
    el("div", { class: "result__head" }, headText, headScore),
    el("div", { class: "result__badges" }, ...badgesEls),
    mode !== "affinite" ? barreTrajectoire(chances) : null,
    mode === "composite" ? chancesInline(chances) : null
  );

  // ── Niveau 2 : justif IA + moyenne + places ───────────────────────────────
  const placesEl = el("p", { class: "result__places" },
    `Places (réf.) — boursiers : ${ouTiret(f.quota_boursiers)} · payant : ${ouTiret(f.quota_payant)} `,
    el("span", { class: "muted", style: "font-size:.72rem" }, "(données guide, peut varier)")
  );

  const niveau2 = el("div", { class: "result__l2" },
    avecSlot
      ? el("div", {
            class: "justification-ia",
            "data-justif-slot": f.id,
            hidden: true,
          },
          el("p", { class: "justification-ia__texte" }),
          el("p", { class: "justification-ia__credit" }, "Généré par IA · à partir de tes données uniquement")
        )
      : null,
    blocMoyenne(r.moyenne),
    condBac.message ? blocConditionBac(condBac) : null,
    placesEl
  );

  // ── Niveau 3 : dépliable (détail score + débouchés + explication chances) ─
  const niveau3 = el("div", { class: "result__l3", hidden: true },
    blocDetailScore(r),
    chancesTexte(chances),
    debouches.length
      ? el("p", { class: "result__debouches-full" },
          el("strong", {}, "Débouchés : "),
          debouches.join(" · "))
      : null
  );

  const toggle = el("button", { class: "result__toggle", type: "button" }, "Voir le détail ▾");
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nowOpen = niveau3.hidden;
    niveau3.hidden = !nowOpen;
    toggle.textContent = nowOpen ? "Masquer ▴" : "Voir le détail ▾";
  });

  const classeCard = ["card result", condBac.ineligible ? "result--ineligible" : ""].join(" ").trim();
  const scoreBreakdown = mode === "composite" && poids ? blocScoreBreakdown(r, poids) : null;

  return el(
    "a",
    { class: classeCard, href: `#/filiere/${encodeURIComponent(f.id)}` },
    niveau1,
    niveau2,
    scoreBreakdown,
    toggle,
    niveau3
  );
}

// =============================================================================
// Helpers d'affichage
// =============================================================================

const ZONE_LABEL = {
  favorable: "Zone favorable",
  limite:    "Zone limite",
  difficile: "Zone difficile",
};
const ZONE_CLASS = {
  favorable: "badge--favorable",
  limite:    "badge--warn",
  difficile: "badge--difficile",
};

function barreTrajectoire(chances) {
  if (!chances?.applicable) return null;
  const left = Math.max(3, Math.min(96, chances.pourcentage));
  return el("div", { class: "trajectoire" },
    el("div", { class: "trajectoire__barre" },
      el("span", {
        class: `trajectoire__repere trajectoire__repere--${chances.zone}`,
        style: `left:${left}%`,
        title: `${chances.pourcentage}% — ${ZONE_LABEL[chances.zone]}`,
      })
    ),
    el("div", { class: "trajectoire__legendes" },
      el("span", {}, "Difficile"),
      el("span", {}, "Limite"),
      el("span", {}, "Favorable")
    )
  );
}

function chancesInline(chances) {
  if (!chances) return null;
  if (!chances.applicable) {
    if (chances.raison === "concours") {
      return el("div", { class: "chances-inline" },
        badge("Concours — épreuve spécifique", "badge--neutral")
      );
    }
    return null;
  }
  return el("div", { class: "chances-inline" },
    el("span", {
        class: `badge ${ZONE_CLASS[chances.zone]}`,
        title: "Estimation indicative — pas une probabilité officielle",
      },
      ZONE_LABEL[chances.zone]
    ),
    el("span", { class: "chances-inline__pct" }, `${chances.pourcentage}% d'admission estimée`)
  );
}

function chancesTexte(chances) {
  if (!chances?.applicable) return null;
  const { moyenneEleve, seuil } = chances;
  const ecart = moyenneEleve - seuil;
  const texte = Math.abs(ecart) < 0.5
    ? "Tu es exactement au niveau habituel des admis."
    : ecart > 0
    ? `Ta moyenne (${moyenneEleve.toFixed(2)}/20) est au-dessus du seuil indicatif (${seuil}).`
    : `Ta moyenne (${moyenneEleve.toFixed(2)}/20) est en dessous du seuil indicatif (${seuil}).`;
  return el("p", { class: "trajectoire__explication" },
    texte,
    " L'admission dépend du nombre de places et des candidats cette année. ",
    el("em", {}, "Estimation indicative, pas une probabilité officielle.")
  );
}

function blocConditionBac(condBac) {
  const icone = condBac.variante === "error" ? "⛔" : condBac.variante === "warn" ? "⚠️" : "ℹ️";
  return el("div", {
    class: `bloc-cond-bac bloc-cond-bac--${condBac.variante ?? "info"}`,
    role: "note",
  },
    el("span", { class: "bloc-cond-bac__icone", "aria-hidden": "true" }, icone),
    el("p", { class: "bloc-cond-bac__texte" }, condBac.message)
  );
}

function blocMoyenne(moyenne) {
  switch (moyenne.statut) {
    case "estimee": {
      const detailTexte = moyenne.detail && moyenne.detail.length
        ? moyenne.detail.map((d) => `${d.matiere} ${d.note} (×${d.coef})`).join(" + ")
          + ` ÷ ${moyenne.sommeCoefs}`
        : moyenne.utilisees.join(", ");
      return el("div", { class: "bloc-moyenne" },
        el("div", { class: "bloc-moyenne__header" },
          badge(`Moyenne de classement : ${moyenne.valeur.toFixed(2)}/20`, "badge--primary")
        ),
        el("p", { class: "bloc-moyenne__detail" }, detailTexte),
        el("p", { class: "bloc-moyenne__note" },
          "Formule officielle du Ministère — l'admission dépend du seuil de l'année.")
      );
    }
    case "incomplete":
      return el("p", { class: "muted", style: "font-size:.82rem;margin:.2rem 0 0" },
        "Moyenne incomplète — notes manquantes : ", moyenne.manquantes.join(", "), "."
      );
    case "coefInconnu":
      return el("p", { class: "muted", style: "font-size:.82rem;margin:.2rem 0 0" },
        `Coefficient introuvable pour « ${moyenne.coefManquant} » en série ${moyenne.serie ?? "?"} — calcul non disponible.`
      );
    case "concours":
      return el("div", { class: "bloc-moyenne" },
        el("div", { class: "bloc-moyenne__header" }, badge("Admission sur concours", "badge--neutral")),
        moyenne.epreuves?.length
          ? el("p", { class: "bloc-moyenne__detail" }, "Épreuves : ", moyenne.epreuves.join(", "))
          : null
      );
    case "sansMatiere":
      return el("p", { class: "muted", style: "font-size:.82rem;margin:.2rem 0 0" },
        "Pas de matière de sélection précisée pour cette filière."
      );
    case "nonClassement":
    case "nonSaisi":
    default:
      return null;
  }
}

/**
 * Ligne du détail score composite.
 * @param {string}      label      Libellé de la composante
 * @param {number}      val        Valeur normalisée [0-1] (pour la barre)
 * @param {string|null} hint       Tooltip explicatif
 * @param {string|null} displayVal Valeur textuelle affichée à droite (ex: "10.75/20").
 *                                 Si null, affiche val*100 + "%".
 */
function ligneScore(label, val, hint, displayVal) {
  const pct     = Math.round(val * 100);
  const neutre  = hint && Math.abs(val - 0.5) < 0.005;
  const affichage = displayVal ?? (pct + "%");
  const row = el("div", { class: "score-detail__row" },
    el("span", { class: "score-detail__label" }, label),
    el("div",  { class: "score-detail__bar-wrap" },
      el("div", { class: "score-detail__bar", style: `width:${pct}%` })
    ),
    el("span", { class: "score-detail__pct" + (neutre ? " score-detail__pct--nd" : "") }, affichage)
  );
  if (hint) row.setAttribute("title", label + " — " + hint);
  return row;
}

function blocDetailScore(r) {
  const d = r.scoreDetail;
  if (!d) return null;

  let margeHint;
  if (r.moyenne?.statut === "concours")       margeHint = "filière sur concours";
  else if (r.moyenne?.statut === "incomplete") margeHint = "notes incomplètes";
  else if (r.moyenne?.statut === "coefInconnu") margeHint = `coef introuvable pour « ${r.moyenne.coefManquant} »`;
  else if (r.moyenne?.statut !== "estimee")    margeHint = "saisis tes notes pour voir ta moyenne";

  // Adéquation académique : afficher la moyenne /20 (jamais un %) pour éviter
  // toute confusion avec le % de chances d'admission qui suit.
  // Quand les notes manquent, "—" plutôt que "50%" (valeur neutre trompeuse).
  const margeLabel = r.moyenne?.statut === "estimee"
    ? r.moyenne.valeur.toFixed(2) + "/20"
    : "—";

  let affiniteHint;
  if (r.rejetDetecte)          affiniteHint = "débouchés non souhaités — score pénalisé";
  else if (!r.aspirationPrise) affiniteHint = "aspiration non renseignée";

  let finHint;
  if (d.sFinancier >= 0.99)      finHint = "places boursières disponibles";
  else if (d.sFinancier >= 0.65) finHint = "places payantes uniquement";
  else                           finHint = "quotas non précisés dans le guide";

  let avenirHint;
  if (r.risqueIAmoyen == null)       avenirHint = "données métiers insuffisantes";
  else if (d.sAvenir >= 0.70)        avenirHint = "métiers peu exposés à l'automatisation";
  else if (d.sAvenir >= 0.45)        avenirHint = "exposition modérée à l'automatisation";
  else                               avenirHint = "forte exposition à l'automatisation";

  return el("div", { class: "score-detail" },
    ligneScore("Adéquation académique", d.sMarge,    margeHint,    margeLabel),
    ligneScore("Adéquation projet",     d.sAffinite, affiniteHint),
    ligneScore("Accès financier",       d.sFinancier, finHint),
    ligneScore("Avenir du métier",      d.sAvenir,   avenirHint),
    ligneScore("Localisation",          d.sGeo,      "ta localisation n'est pas encore collectée dans cette version")
  );
}

/**
 * Détail toujours visible du score composite (Filtre 3 uniquement).
 * Montre : note brute × poids → contribution, puis total.
 * Seuls les critères avec poids > 0 apparaissent → cohérence garantie.
 */
function blocScoreBreakdown(r, poids) {
  const d = r.scoreDetail;
  if (!d) return null;

  const CRITERES = [
    {
      label: "Adéquation projet",
      composante: d.sAffinite,
      poidsVal: poids.affinite_reve,
      neutre: !r.aspirationPrise,
      hintNeutre: "aspiration non évaluée — valeur neutre 50%",
    },
    {
      label: "Adéquation académique",
      composante: d.sMarge,
      poidsVal: poids.marge_academique,
      neutre: r.moyenne?.statut !== "estimee",
      hintNeutre: "notes non saisies — valeur neutre 50%",
    },
    {
      label: "Avenir du métier",
      composante: d.sAvenir,
      poidsVal: poids.avenir_metier,
      neutre: r.risqueIAmoyen == null,
      hintNeutre: "données métiers insuffisantes — valeur neutre 50%",
    },
    {
      label: "Accès financier",
      composante: d.sFinancier,
      poidsVal: poids.accessibilite_financiere,
      neutre: false,
    },
    {
      label: "Localisation",
      composante: d.sGeo,
      poidsVal: poids.accessibilite_geo,
      neutre: true,
      hintNeutre: "localisation non collectée — valeur neutre 50%",
    },
  ];

  const actifs = CRITERES.filter((c) => c.poidsVal > 0);
  if (!actifs.length) return null;

  // Formate un nombre de points : 1 décimale max, virgule française, sans zéro inutile.
  const fmtPts = (n) => {
    const r1 = Math.round(n * 10) / 10;
    return (r1 % 1 === 0 ? r1.toFixed(0) : r1.toFixed(1).replace(".", ",")) + " pts";
  };

  const lignes = actifs.map((c) => {
    const rawPct  = Math.round(c.composante * 100);
    const poidsPct = Math.round(c.poidsVal * 100);
    const contrib  = c.composante * c.poidsVal * 100;
    const rawLabel = c.neutre ? `~${rawPct}%` : `${rawPct}%`;

    return el(
      "div",
      {
        class: "score-bkd__row" + (c.neutre ? " score-bkd__row--neutre" : ""),
        ...(c.neutre && c.hintNeutre ? { title: c.hintNeutre } : {}),
      },
      el("span", { class: "score-bkd__label" }, c.label),
      el(
        "span",
        { class: "score-bkd__math" },
        `${rawLabel} × ${poidsPct}% → `,
        el("strong", {}, fmtPts(contrib))
      )
    );
  });

  const totalPct = Math.round(r.scoreComposite * 100);

  return el(
    "div",
    { class: "score-bkd" },
    ...lignes,
    el("div", { class: "score-bkd__sep" }),
    el(
      "div",
      { class: "score-bkd__total" },
      el("span", { class: "score-bkd__total-label" }, "Score de compatibilité"),
      el("strong", { class: "score-bkd__total-val" }, `${totalPct}%`)
    )
  );
}

function modeEntreeVariante(mode) {
  if (mode === "Concours")   return "badge--neutral";
  if (mode === "Classement") return "badge--primary";
  return "";
}
