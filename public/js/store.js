// =============================================================================
// store.js — État du wizard, sauvegardé automatiquement en localStorage
// -----------------------------------------------------------------------------
// Pas de compte : le parcours (série, notes, aspiration) est persistant côté
// navigateur. Chaque écriture sauvegarde immédiatement (autosave à chaque étape).
//
// Forme de l'état :
//   {
//     serie:      string|null     // ex. "D"
//     notes:      { [matiereBrute]: number }   // clé = texte BRUT de la matière
//     coefs:      { [matiereBrute]: number }   // coefficient manuel (si modifié par l'élève)
//     aspiration: string
//   }
// Les clés de `notes` et `coefs` sont les chaînes `matiere` BRUTES résolues.
// coefs ne contient QUE les valeurs MODIFIÉES par l'élève ; le calcul utilise
// la table officielle comme fallback si une matière n'est pas présente.
// =============================================================================

const CLE = "iao_wizard_v1";

const ETAT_DEFAUT = { serie: null, notes: {}, coefs: {}, moyenneBac: null, aspiration: "", domaines: [] };

/** Lit l'état courant (fusionné avec les valeurs par défaut). */
export function lireEtat() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return { ...ETAT_DEFAUT, notes: {}, coefs: {} };
    const parse = JSON.parse(brut);
    return {
      ...ETAT_DEFAUT,
      ...parse,
      notes: { ...(parse && parse.notes ? parse.notes : {}) },
      coefs: { ...(parse && parse.coefs ? parse.coefs : {}) },
    };
  } catch {
    return { ...ETAT_DEFAUT, notes: {}, coefs: {} };
  }
}

/** Applique un patch partiel et sauvegarde. Retourne l'état complet à jour. */
export function patcherEtat(patch) {
  const etat = { ...lireEtat(), ...patch };
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    /* quota / mode privé : on ignore silencieusement la persistance */
  }
  return etat;
}

/** Définit la série choisie. */
export function definirSerie(serie) {
  return patcherEtat({ serie });
}

/**
 * Définit (ou efface) la note d'une matière brute.
 * @param {string} matiereBrute  Clé = texte brut exact de la matière.
 * @param {number|null} valeur   Note 0–20, ou null/NaN pour effacer.
 */
export function definirNote(matiereBrute, valeur) {
  const etat = lireEtat();
  const notes = { ...etat.notes };
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) {
    delete notes[matiereBrute];
  } else {
    notes[matiereBrute] = valeur;
  }
  return patcherEtat({ notes });
}

/**
 * Définit (ou efface) le coefficient manuel d'une matière.
 * null/undefined/NaN → supprime la valeur (retour au coefficient de la table).
 */
export function definirCoef(matiereBrute, valeur) {
  const etat = lireEtat();
  const coefs = { ...etat.coefs };
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) {
    delete coefs[matiereBrute];
  } else {
    coefs[matiereBrute] = valeur;
  }
  return patcherEtat({ coefs });
}

/** Définit l'aspiration (texte libre). */
export function definirAspiration(aspiration) {
  return patcherEtat({ aspiration: aspiration || "" });
}

/** Définit la moyenne générale du bac (0–20) ou null pour effacer. */
export function definirMoyenneBac(valeur) {
  const v = (valeur === null || valeur === undefined || Number.isNaN(Number(valeur)))
    ? null
    : Math.min(20, Math.max(0, Number(valeur)));
  return patcherEtat({ moyenneBac: v });
}

/** Définit les domaines sélectionnés (tableau d'ids, max 3). */
export function definirDomaines(ids) {
  return patcherEtat({ domaines: Array.isArray(ids) ? ids.slice(0, 3) : [] });
}

/** Réinitialise complètement le parcours. */
export function reinitialiser() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* ignore */
  }
}
