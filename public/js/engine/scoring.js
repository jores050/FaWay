// =============================================================================
// engine/scoring.js — Score composite de classement des filières éligibles
// -----------------------------------------------------------------------------
// Fusionne trois signaux (affinité, marge académique, résistance IA) + deux
// approximations (accessibilité géo et financière) en un score unique [0-1].
//
// Les pondérations viennent de `config_scoring` en base (chargées dans
// `donnees.poids` par queries.js). Ne jamais les coder ici en dur.
//
// Chaque composante est normalisée [0-1] avant pondération. Le score neutre 0.5
// est utilisé quand une composante est indisponible (jamais de NaN ni de null).
// =============================================================================

/**
 * Calcule le score composite d'une filière éligible.
 *
 * @param {object} r               Résultat issu de filtrer() (filiere, moyenne, risqueIAmoyen…)
 * @param {number|null} similarite Similarité cosinus [0-1] de l'aspiration (null si non calculée)
 * @param {object} poids           Pondérations depuis donnees.poids
 * @returns {{ score: number, detail: object }}
 */
export function calculerScoreComposite(r, similarite, poids) {
  // ── score_affinite_reve ────────────────────────────────────────────────────
  // Similarité cosinus si aspiration saisie, sinon 0.5 (neutre — pas de pénalité).
  const sAffinite = similarite != null && Number.isFinite(similarite)
    ? Math.min(1, Math.max(0, similarite))
    : 0.5;

  // ── score_marge_academique ─────────────────────────────────────────────────
  // Moyenne estimée / 20. Concours ou pas de notes → 0.5 (neutre).
  let sMarge = 0.5;
  if (r.moyenne && r.moyenne.statut === "estimee" && r.moyenne.valeur != null) {
    sMarge = Math.min(1, Math.max(0, r.moyenne.valeur / 20));
  }

  // ── score_resistance_ia ────────────────────────────────────────────────────
  // 1 − (risque_moyen / 100). Aucun métier scoré → 0.5 (neutre).
  let sIA = 0.5;
  if (r.risqueIAmoyen != null && Number.isFinite(r.risqueIAmoyen)) {
    sIA = Math.min(1, Math.max(0, 1 - r.risqueIAmoyen / 100));
  }

  // ── score_accessibilite_geo ────────────────────────────────────────────────
  // TODO: la ville de l'utilisateur n'est pas encore collectée dans le wizard
  // (étape 1-2-3 ne demandent pas la ville). Mettre à 0.5 (neutre) jusqu'à
  // l'ajout d'une étape de localisation. Logique cible :
  //   même ville que l'étab → 1.0 | autre ville Bénin → 0.7 | non précisé → 0.5
  const sGeo = 0.5;

  // ── score_accessibilite_financiere ─────────────────────────────────────────
  // Approximation grossière (pondérée à 5% seulement).
  let sFinancier = 0.3; // quotas inconnus
  const qB = Number(r.filiere.quota_boursiers);
  const qP = Number(r.filiere.quota_payant);
  if (qB > 0) sFinancier = 1.0;        // place boursière possible
  else if (qP > 0) sFinancier = 0.7;   // payant seulement

  // ── score final ────────────────────────────────────────────────────────────
  const raw =
    poids.affinite_reve            * sAffinite +
    poids.marge_academique         * sMarge    +
    poids.resistance_ia            * sIA       +
    poids.accessibilite_geo        * sGeo      +
    poids.accessibilite_financiere * sFinancier;

  // Garde-fou absolu : jamais NaN, toujours dans [0-1].
  const score = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.5;

  return {
    score,
    detail: { sAffinite, sMarge, sIA, sGeo, sFinancier },
  };
}
