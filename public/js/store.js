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
//     aspiration: string
//   }
// Les clés de `notes` sont les chaînes `matiere` BRUTES (jamais renormalisées),
// pour rester cohérentes avec ce qui est affiché et avec criteres_classement.
// =============================================================================

const CLE = "iao_wizard_v1";

const ETAT_DEFAUT = { serie: null, notes: {}, aspiration: "", domaines: [] };

/** Lit l'état courant (fusionné avec les valeurs par défaut). */
export function lireEtat() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return { ...ETAT_DEFAUT, notes: {} };
    const parse = JSON.parse(brut);
    return {
      ...ETAT_DEFAUT,
      ...parse,
      notes: { ...(parse && parse.notes ? parse.notes : {}) },
    };
  } catch {
    // localStorage indisponible ou JSON corrompu : on repart proprement.
    return { ...ETAT_DEFAUT, notes: {} };
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

/** Définit l'aspiration (texte libre). */
export function definirAspiration(aspiration) {
  return patcherEtat({ aspiration: aspiration || "" });
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
