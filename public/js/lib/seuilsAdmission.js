// =============================================================================
// lib/seuilsAdmission.js — Estimation des chances d'admission par filière
// -----------------------------------------------------------------------------
// Approche : chaque filière est classée dans un niveau de demande qui détermine
// son seuil indicatif (la moyenne de classement habituelle des admis).
//
// Formule : pct = 50 + (moyenne_eleve - seuil) × 12  (clamped [5, 95])
// Zones   : ≥65 → favorable | 35–64 → limite | <35 → difficile
//
// TRANSPARENCE : ce pourcentage n'est PAS une probabilité officielle.
// Le seuil réel varie chaque année (nombre de places, candidats, décisions).
// Il compare la moyenne de l'élève au niveau habituel des admis.
//
// Module PUR (sans dépendance navigateur) → testable sous Node.
// =============================================================================

// Seuils par niveau de demande (modifiables ici sans toucher à la logique)
export const SEUILS = {
  TRES_DEMANDEE: 14,
  DEMANDEE:      12,
  MOYENNE:       11,
  PEU_DEMANDEE:  10,
};

const DEFAUT = SEUILS.MOYENNE; // seuil pour les filières non classées

/**
 * Classe une filière selon son niveau de demande et retourne le seuil indicatif.
 *
 * Priorité :
 *   1. Valeur stockée en base (`niveau_demande`) — source de vérité après migration.
 *   2. Regex sur l'intitulé/établissement — fallback pour les filières non encore
 *      classées en base (migration partielle ou nouvelle filière non taguée).
 *
 * @param {string}      intitule      filiere.intitule
 * @param {string}      etabNom       etablissement.nom  (peut être null)
 * @param {string}      etabSigle     etablissement.sigle (peut être null)
 * @param {string|null} niveauDemande filiere.niveau_demande (DB, prioritaire)
 * @returns {number} seuil indicatif
 */
export function classerFiliere(intitule, etabNom, etabSigle, niveauDemande) {
  // ── Valeur DB (prioritaire) ───────────────────────────────────────────────
  if (niveauDemande) {
    const mapDB = {
      tres_demandee: SEUILS.TRES_DEMANDEE,
      demandee:      SEUILS.DEMANDEE,
      moyenne:       SEUILS.MOYENNE,
      peu_demandee:  SEUILS.PEU_DEMANDEE,
    };
    if (mapDB[niveauDemande] != null) return mapDB[niveauDemande];
    console.warn("[seuilsAdmission] valeur niveau_demande inconnue :", niveauDemande);
  }

  // ── Fallback regex (filières non encore classées en base) ─────────────────
  const i = String(intitule ?? "").toLowerCase();
  const e = `${etabNom ?? ""} ${etabSigle ?? ""}`.toLowerCase();

  // ── TRÈS DEMANDÉE (14) ───────────────────────────────────────────────────
  if (/médecine|pharmacie/i.test(i)) return SEUILS.TRES_DEMANDEE;
  if (/kinésithérapie|kiné\b/i.test(i)) return SEUILS.TRES_DEMANDEE;
  if (/sciences infirmières|sciences obstétrical/i.test(i)) return SEUILS.TRES_DEMANDEE;
  if (/intelligence artificielle/i.test(i)) return SEUILS.TRES_DEMANDEE;
  if (/\bdroit\b/i.test(i)) return SEUILS.TRES_DEMANDEE;
  // Génie à l'EPAC uniquement
  if (/génie/i.test(i) && /epac/i.test(e)) return SEUILS.TRES_DEMANDEE;
  // Informatique à l'IFRI uniquement
  if (/informatique/i.test(i) && /ifri/i.test(e)) return SEUILS.TRES_DEMANDEE;

  // ── DEMANDÉE (12) ────────────────────────────────────────────────────────
  if (/gestion|économi|economie/i.test(i)) return SEUILS.DEMANDEE;
  if (/banque|finance|comptabilit|marketing|statistique/i.test(i)) return SEUILS.DEMANDEE;
  if (/génie/i.test(i)) return SEUILS.DEMANDEE; // Génie hors EPAC
  if (/génie logiciel|logiciel|réseaux|cybersécurité|sécurité info/i.test(i)) return SEUILS.DEMANDEE;
  if (/informatique/i.test(i)) return SEUILS.DEMANDEE; // Informatique hors IFRI

  // ── PEU DEMANDÉE (10) ────────────────────────────────────────────────────
  if (/lettres modernes|lettres classiques/i.test(i)) return SEUILS.PEU_DEMANDEE;
  if (/\ballemand\b|\bespagnol\b|\bchinois/i.test(i)) return SEUILS.PEU_DEMANDEE;
  if (/\bphilosophie\b/i.test(i)) return SEUILS.PEU_DEMANDEE;
  if (/langue arabe|arabe\b/i.test(i)) return SEUILS.PEU_DEMANDEE;
  // "Histoire" seule (pas "Histoire-Géographie" qui reste MOYENNE)
  if (/\bhistoire\b/i.test(i) && !/géograph/i.test(i)) return SEUILS.PEU_DEMANDEE;

  // ── MOYENNE (11) — filières UNA + défaut ─────────────────────────────────
  // Toutes filières agricoles UNA ou non classées ci-dessus → défaut 11
  return DEFAUT;
}

/**
 * Convertit une moyenne de classement en pourcentage d'admission estimé.
 * @param {number} moyenne  Moyenne officielle de l'élève (0–20)
 * @param {number} seuil    Seuil indicatif de la filière
 * @returns {number} pourcentage [5–95]
 */
export function calculerPourcentage(moyenne, seuil) {
  const raw = 50 + (moyenne - seuil) * 12;
  return Math.round(Math.min(95, Math.max(5, raw)));
}

/**
 * @param {number} pct
 * @returns {"favorable" | "limite" | "difficile"}
 */
export function determinerZone(pct) {
  if (pct >= 65) return "favorable";
  if (pct >= 35) return "limite";
  return "difficile";
}

/**
 * Point d'entrée principal — calcule les chances d'admission pour un résultat.
 *
 * @param {{ filiere, etablissement, moyenne }} r  Résultat issu de filtrer()
 * @returns {{
 *   applicable: boolean,
 *   seuil?: number, pourcentage?: number,
 *   zone?: "favorable"|"limite"|"difficile",
 *   moyenneEleve?: number
 * }}
 */
export function calculerChancesAdmission(r) {
  // Concours → admission sur épreuves, la moyenne bac n'est pas le critère
  if (r.filiere?.mode_entree === "Concours") return { applicable: false, raison: "concours" };

  // Pas de moyenne calculée (notes non saisies, incomplètes, coef inconnu…)
  if (!r.moyenne || r.moyenne.statut !== "estimee" || r.moyenne.valeur == null) {
    return { applicable: false, raison: "sansMoyenne" };
  }

  const seuil = classerFiliere(
    r.filiere?.intitule,
    r.etablissement?.nom,
    r.etablissement?.sigle,
    r.filiere?.niveau_demande   // DB prioritaire, null si colonne absente
  );
  // pourcentageBrut : valeur continue [5-95] pour les tris en cascade (jamais arrondi).
  // pourcentage     : entier pour l'affichage uniquement.
  const raw            = 50 + (r.moyenne.valeur - seuil) * 12;
  const pourcentageBrut = Math.min(95, Math.max(5, raw));
  const pourcentage    = Math.round(pourcentageBrut);
  const zone = determinerZone(pourcentage);

  return { applicable: true, seuil, pourcentage, pourcentageBrut, zone, moyenneEleve: r.moyenne.valeur };
}
