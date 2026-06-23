// =============================================================================
// engine/filtrage.js — Moteur d'éligibilité + moyenne de classement officielle
// -----------------------------------------------------------------------------
// Étapes :
//   1. L'utilisateur choisit une série (ex. "D").
//   2. On parcourt criteres_classement et on garde les filières où la série
//      apparaît comme TOKEN ISOLÉ (via serieParser.matchSerie), + les filières
//      "Toutes séries confondues" / sans aucun critère (ouvertes à tous).
//   3. Si des notes sont saisies : moyenne de classement OFFICIELLE pondérée
//      M = Σ(note × coef) / Σ(coef) avec les coefficients de l'arrêté N°016-2003.
//      Source : guide d'orientation officiel du Ministère, page 8.
//   4. Aspiration : simple filtrage MOTS-CLÉS sur intitule + debouches.
//      ⚠️ Placeholder — PAS le moteur sémantique (embeddings) prévu à terme.
//   5. Tri par quota_boursiers décroissant (proxy d'accessibilité), NULL en dernier.
// =============================================================================

import { matchSerie, parse } from "../lib/serieParser.js";
import { resoudreMatiere } from "../lib/matiereResolver.js";
import { analyserAspiration, scoreAspiration } from "../lib/aspiration.js";
import { trouverCoefficient } from "../lib/coefficients.js";

/** Clé/forme canonique d'une matière : on se contente de trim (jamais de
 *  réinterprétation du texte conditionnel, qui reste affiché brut). */
const cleMatiere = (m) => String(m).trim();

/** Découpe le champ `debouches` (items séparés par "; "). */
export function splitDebouches(text) {
  if (!text) return [];
  return String(text)
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Une filière est-elle ouverte à toutes les séries ?
 *  Vrai si aucune ligne de critère (ex. Langue Chinoise) ou si un critère porte
 *  explicitement "Toutes séries confondues". */
function estOuvertToutesSeries(rows) {
  if (!rows || rows.length === 0) return true;
  return rows.some((r) => parse(r.serie_bac).toutesSeries);
}

// Mode d'entrée (cf. schéma réel : 'Classement', 'Concours' ou NULL).
//   - "Classement" : admission au classement -> une moyenne estimée a du sens.
//   - "Concours"   : admission sur épreuves -> AUCUNE moyenne (les lignes de
//                    criteres_classement sont des épreuves, pas des matières notées).
//   - NULL         : non précisé (ex. filières "Toutes séries confondues").
const estClassement = (f) => !!f && f.mode_entree === "Classement";
const estConcours = (f) => !!f && f.mode_entree === "Concours";

/**
 * Liste des matières (distinctes) à proposer en étape 2 pour la série choisie.
 * Chaque libellé de `criteres_classement.matiere` est RÉSOLU pour la série AVANT
 * déduplication (cf. matiereResolver) : un utilisateur en série C ne verra donc
 * jamais "(DT/STI)" ou "(... pour EA)", mais la matière simple qui le concerne.
 */
export function matieresPourSerie(donnees, serie) {
  const vues = new Map(); // clé résolue -> forme d'affichage
  for (const row of donnees.criteres) {
    if (!row.matiere) continue;
    if (!matchSerie(serie, row.serie_bac)) continue;
    // Les notes ne nourrissent QUE les filières "Classement". On exclut Concours
    // et NULL : leurs lignes sont des épreuves de concours (ex. "Culture générale",
    // "Commentaire de texte en …", "Pratique EPS"), pas des matières à moyenner.
    if (!estClassement(donnees.filiereParId.get(row.filiere_id))) continue;
    const cle = cleMatiere(resoudreMatiere(row.matiere, serie));
    if (cle && !vues.has(cle)) vues.set(cle, cle);
  }
  return Array.from(vues.values());
}

/**
 * Calcule la moyenne de classement officielle pondérée pour une filière.
 * Formule : M = Σ(note × coef) / Σ(coef)  (arrêté N°016-2003, guide Ministère p.8)
 *
 * Statuts retournés :
 *   "estimee"     — calcul réussi, valeur et detail disponibles
 *   "nonSaisi"    — l'élève n'a saisi aucune note
 *   "incomplete"  — au moins une note manquante parmi les matières requises
 *   "coefInconnu" — notes OK mais coefficient absent de la table ET non saisi → neutralisé
 *   "sansMatiere" — filière sans matière de sélection précisée
 *
 * @param {string[]} matieres  Matières résolues pour la filière
 * @param {object}  notes      { [matiere]: number } — notes saisies
 * @param {object}  coefs      { [matiere]: number } — coefficients manuels (store); peut être {}
 * @param {string}  serie      Série bac de l'élève
 */
function calculerMoyenneClassement(matieres, notes, coefs, serie) {
  if (matieres.length === 0) {
    return { statut: "sansMatiere", valeur: null, utilisees: [], manquantes: [], detail: [], sommeCoefs: 0, serie };
  }
  const aDesNotes = notes && Object.keys(notes).length > 0;
  if (!aDesNotes) {
    return { statut: "nonSaisi", valeur: null, utilisees: [], manquantes: [], detail: [], sommeCoefs: 0, serie };
  }

  // Vérifier qu'une note est saisie pour CHAQUE matière
  const manquantes = matieres.filter(
    (m) => !(m in notes) || notes[m] === null || notes[m] === undefined
  );
  if (manquantes.length > 0) {
    return { statut: "incomplete", valeur: null, utilisees: [], manquantes, detail: [], sommeCoefs: 0, serie };
  }

  // Résoudre le coefficient : priorité au coef saisi par l'élève, sinon table officielle.
  const detail = [];
  for (const m of matieres) {
    const coefUser = coefs && coefs[m] != null ? Number(coefs[m]) : NaN;
    const coefSaisi = Number.isFinite(coefUser) && coefUser > 0 ? coefUser : null;
    const resTable = coefSaisi == null ? trouverCoefficient(m, serie) : null;
    const coefVal = coefSaisi ?? resTable?.coef ?? null;

    if (coefVal == null) {
      console.warn(`[coefficients] matière "${m}" sans coefficient pour "${serie}" — calcul neutralisé`);
      return { statut: "coefInconnu", valeur: null, utilisees: matieres, manquantes: [], detail: [], sommeCoefs: 0, coefManquant: m, serie };
    }
    detail.push({
      matiere: m,
      note: Number(notes[m]),
      coef: coefVal,
      canonique: resTable?.canonique ?? m,
      coefSource: coefSaisi != null ? "utilisateur" : "table",
    });
  }

  const sommeCoefs = detail.reduce((s, d) => s + d.coef, 0);
  const somme = detail.reduce((s, d) => s + d.note * d.coef, 0);
  const valeur = Math.round((somme / sommeCoefs) * 100) / 100;

  return {
    statut: "estimee",
    valeur,
    utilisees: matieres,
    manquantes: [],
    detail,
    sommeCoefs,
    serie,
  };
}

/** Tri par quota_boursiers décroissant ; valeurs NULL/absentes en dernier. */
function comparerParQuotaBoursiers(a, b) {
  const va = a.filiere.quota_boursiers;
  const vb = b.filiere.quota_boursiers;
  const na = va === null || va === undefined ? -Infinity : Number(va);
  const nb = vb === null || vb === undefined ? -Infinity : Number(vb);
  if (nb !== na) return nb - na;
  // Départage stable par intitulé pour un affichage déterministe.
  return String(a.filiere.intitule || "").localeCompare(
    String(b.filiere.intitule || ""),
    "fr"
  );
}

/**
 * Moteur principal : produit la liste classée des filières éligibles.
 * @param {object} donnees  Bundle de chargerDonnees().
 * @param {{serie:string|null, notes:object, aspiration:string}} etat
 * @returns {{ serie:string|null, resultats:object[], infoAspiration: null|{actif:boolean, mots:string[], nbPertinentes:number} }}
 */
export function filtrer(donnees, etat) {
  const serie = etat.serie;
  // Aspiration = signal de PERTINENCE (classement), jamais éliminatoire.
  const { mots, termes } = analyserAspiration(etat.aspiration);
  const aspActive = mots.length > 0;

  let resultats = [];
  for (const f of donnees.filieres) {
    const rows = donnees.criteresParFiliere.get(f.id) || [];
    const matching = rows.filter((r) => matchSerie(serie, r.serie_bac));
    const ouvert = estOuvertToutesSeries(rows);
    if (matching.length === 0 && !ouvert) continue; // pas éligible

    // Matières/épreuves de la filière, RÉSOLUES pour la série puis dédupliquées
    // (≤ 3 lignes par filière en base -> ≤ 3 entrées). Les notes saisies en étape 2
    // sont clées sur ces libellés résolus : la correspondance est cohérente.
    const matieres = Array.from(
      new Set(
        matching
          .filter((r) => r.matiere)
          .map((r) => cleMatiere(resoudreMatiere(r.matiere, serie)))
          .filter(Boolean) // "" = matière non applicable à cette série -> on l'ignore
      )
    );

    // La moyenne estimée n'a de sens QUE pour le classement (cf. estClassement).
    let moyenne;
    if (estConcours(f)) {
      moyenne = { statut: "concours", epreuves: matieres, valeur: null, utilisees: [], manquantes: [] };
    } else if (estClassement(f)) {
      moyenne = calculerMoyenneClassement(matieres, etat.notes, etat.coefs || {}, serie);
    } else {
      // mode_entree NULL : ni classement ni concours -> pas de moyenne.
      moyenne =
        matieres.length === 0
          ? { statut: "sansMatiere", valeur: null, utilisees: [], manquantes: [] }
          : { statut: "nonClassement", valeur: null, utilisees: matieres, manquantes: [] };
    }

    // Indicateur RISQUE IA agrégé (affichage seul, JAMAIS un critère de tri ici) :
    // score minimum parmi les métiers liés ayant un score connu = "le métier le
    // plus à l'abri". null s'il n'y a aucun métier scoré (-> pas de badge en liste).
    const metiersF = (donnees.metiersParFiliere && donnees.metiersParFiliere.get(f.id)) || [];
    const scoresIA = metiersF.map((m) => m.score).filter((s) => s != null);
    const risqueIAmin = scoresIA.length ? Math.min(...scoresIA) : null;
    const risqueIAmoyen = scoresIA.length
      ? scoresIA.reduce((s, v) => s + v, 0) / scoresIA.length
      : null;

    resultats.push({
      filiere: f,
      etablissement: donnees.etabParId.get(f.etablissement_id) || null,
      matieres,
      eligibiliteType: matching.length > 0 ? "critere" : "toutesSeries",
      moyenne,
      scoreAspiration: aspActive ? scoreAspiration(f, termes) : 0,
      risqueIAmin,
      risqueIAmoyen,
    });
  }

  // L'aspiration NE supprime jamais une filière éligible : elle remonte les plus
  // pertinentes en tête (score décroissant), puis on départage par quota.
  let infoAspiration = null;
  if (aspActive) {
    const nbPertinentes = resultats.filter((r) => r.scoreAspiration > 0).length;
    infoAspiration = { actif: true, mots, nbPertinentes };
  }

  resultats.sort((a, b) => {
    if (aspActive && b.scoreAspiration !== a.scoreAspiration) {
      return b.scoreAspiration - a.scoreAspiration;
    }
    return comparerParQuotaBoursiers(a, b);
  });

  return { serie, resultats, infoAspiration };
}
