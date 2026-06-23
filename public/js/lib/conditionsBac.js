// =============================================================================
// lib/conditionsBac.js — Conditions de moyenne générale du bac par filière
// -----------------------------------------------------------------------------
// Règle par défaut : filières à concours → bourse si moyenne ≥ 12 (AB).
// Exceptions terrain :
//   INSPEI — seuil 12 bloquant (zéro place payante, concours fermé < 12).
//   IMSP   — seuil 12 pour la bourse seulement, payant toujours possible.
// Module PUR (pas de dépendance navigateur).
// =============================================================================

/** Intitulés exacts issus de la base (ne pas modifier sans re-vérifier). */
const INTITULE_INSPEI = "Sciences et Techniques de l'Ingénieur";
const INTITULE_IMSP   = "Classes préparatoires MPSI et PCSI";

/**
 * L'INSPEI est identifiée en priorité par le flag DB `regle_concours_speciale`.
 * Fallback sur l'intitulé exact pendant la période de migration (ou si la DB
 * n'a pas encore été patchée).
 */
export function estINSPEI(filiere) {
  if (filiere.regle_concours_speciale === "inspei_bloquant") return true;
  return filiere.mode_entree === "Concours" && filiere.intitule === INTITULE_INSPEI;
}

/**
 * L'IMSP est identifiée en priorité par le flag DB `regle_concours_speciale`.
 * Fallback sur l'intitulé exact.
 */
export function estIMSP(filiere) {
  if (filiere.regle_concours_speciale === "imsp_payant_possible") return true;
  return filiere.intitule === INTITULE_IMSP;
}

/**
 * Évalue la condition de moyenne générale du bac pour une filière.
 *
 * @param {object} filiere     Ligne filieres (mode_entree, intitule, quota_payant…)
 * @param {number|null} moy    Moyenne générale saisie (0–20) ou null si non saisie
 * @returns {{
 *   message:    string|null,   // texte à afficher dans la carte (null = rien)
 *   ineligible: boolean,       // true uniquement pour INSPEI < 12
 *   badgePrepa: string|null,   // libellé du badge tremplin si applicable
 *   variante:   string|null,   // "warn" | "error" | "info" | "accent" | null
 * }}
 */
export function evaluerConditionMoyenneBac(filiere, moy) {
  const isConcours = filiere.mode_entree === "Concours";

  // ── Badge tremplin (indépendant de la moyenne) ────────────────────────────
  let badgePrepa = null;
  if (estINSPEI(filiere)) {
    badgePrepa = "Classe prépa ingénieur (2 ans) — mène au cycle ingénieur UNSTIM";
  } else if (estIMSP(filiere)) {
    badgePrepa = "Classe préparatoire MPSI/PCSI — mène aux grandes écoles d'ingénieurs";
  }

  // ── Cas INSPEI (seuil bloquant, zéro payant) ──────────────────────────────
  if (estINSPEI(filiere)) {
    if (moy === null || moy === undefined) {
      return {
        message: "L'INSPEI exige une moyenne générale d'au moins 12 pour participer au concours, et ne propose que des places boursières.",
        ineligible: false,
        badgePrepa,
        variante: "warn",
      };
    }
    if (moy < 12) {
      return {
        message: "L'INSPEI exige une moyenne générale d'au moins 12 pour participer au concours, et ne propose que des places boursières. Avec moins de 12, l'accès n'est pas possible.",
        ineligible: true,
        badgePrepa,
        variante: "error",
      };
    }
    return { message: null, ineligible: false, badgePrepa, variante: null };
  }

  // ── Cas IMSP (seuil pour la bourse seulement, payant toujours possible) ───
  if (estIMSP(filiere)) {
    if (moy === null || moy === undefined) {
      return { message: null, ineligible: false, badgePrepa, variante: null };
    }
    if (moy < 12) {
      return {
        message: "Avec moins de 12, tu peux suivre l'IMSP en tant que payant (non boursier). Le concours détermine qui obtient une bourse.",
        ineligible: false,
        badgePrepa,
        variante: "info",
      };
    }
    return {
      message: "Tu remplis la condition pour viser une place boursière à l'IMSP. Le concours détermine le classement final.",
      ineligible: false,
      badgePrepa,
      variante: "accent",
    };
  }

  // ── Règle par défaut : toutes les autres filières à concours ──────────────
  if (isConcours) {
    if (moy === null || moy === undefined) {
      return {
        message: "Les concours exigent généralement une moyenne d'au moins 12 pour une bourse.",
        ineligible: false,
        badgePrepa: null,
        variante: "info",
      };
    }
    if (moy < 12) {
      return {
        message: "Pour une place boursière, une moyenne d'au moins 12 est requise. Des places payantes restent possibles selon l'école — vérifie auprès de l'établissement.",
        ineligible: false,
        badgePrepa: null,
        variante: "warn",
      };
    }
    return { message: null, ineligible: false, badgePrepa: null, variante: null };
  }

  // ── Filière hors concours (badge prépa IMSP uniquement si applicable) ─────
  return { message: null, ineligible: false, badgePrepa, variante: null };
}
