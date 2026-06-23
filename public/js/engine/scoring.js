// =============================================================================
// engine/scoring.js — Score composite de classement des filières éligibles
// -----------------------------------------------------------------------------
// Fusionne trois composantes en un score unique [0-1] :
//   marge académique (46.67%) · affinité aspiration (33.33%) · avenir du métier (20%)
// accessibilité financière et géographique retirées (poids 0) — total = 1.0
//
// Les pondérations viennent de `config_scoring` en base (chargées dans
// `donnees.poids` par queries.js). Ne jamais les coder ici en dur.
//
// Chaque composante est normalisée [0-1] avant pondération. Le score neutre 0.5
// est utilisé quand une composante est indisponible (jamais de NaN ni de null).
// =============================================================================

/**
 * Normalise un texte pour comparaison : minuscules, sans accents, sans ponctuation.
 * @param {string} t
 * @returns {string}
 */
function normaliserTexte(t) {
  return String(t).toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

/** Découpe un champ `debouches` en items individuels (séparateur "; "). */
function splitItems(debouches) {
  if (!debouches) return [];
  return String(debouches).split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Un item (debouché ou métier) correspond-il à un terme rejeté ?
 *
 * Matching par racine (min 5 chars, max 7) avec vérification de limite de mot :
 * la racine doit apparaître en DÉBUT de mot dans l'item normalisé, pas au milieu
 * d'un autre mot (ex. "commerc" matche "commercial" mais pas "microcommerce").
 *
 * Seuil 5 chars minimum (était 4) : réduit les faux positifs sur les fragments courts.
 * Borne supérieure 7 chars : couvre les variantes genre/nombre
 *   ("enseign" → enseignant/enseignement/enseignante).
 *
 * @param {string}   item    Un debouché ou nom de métier (texte brut)
 * @param {string[]} rejette Termes rejetés extraits par Gemini
 * @returns {boolean}
 */
function itemMatcheRejet(item, rejette) {
  const texteItem = normaliserTexte(item);
  if (!texteItem) return false;

  for (const terme of rejette) {
    const n = normaliserTexte(terme);
    // Tous les mots significatifs du terme (≥ 5 chars)
    const motsPrincipaux = n.split(" ").filter((w) => w.length >= 5);
    if (motsPrincipaux.length === 0) continue; // terme trop court → ignoré

    for (const mot of motsPrincipaux) {
      const racine = mot.slice(0, Math.min(7, mot.length));
      // La racine doit démarrer à la frontière d'un mot (début de chaîne ou après espace).
      // Évite de matcher "commerc" dans "microcommerce" mais capture "commercial".
      const pattern = new RegExp(
        "(?:^|\\s)" + racine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      );
      if (pattern.test(texteItem)) return true;
    }
  }
  return false;
}

/**
 * Calcule le facteur de pénalité de rejet [0–1] selon la position et la proportion
 * des débouchés/métiers qui matchent un terme explicitement rejeté.
 *
 * Pondération positionnelle (items du champ `debouches`) :
 *   index 0 → 1.00  (débouché principal, le plus représentatif du métier visé)
 *   index 1 → 0.75
 *   index 2 → 0.55
 *   index 3 → 0.40
 *   index 4+ → 0.25  (plancher)
 * Métiers structurés (metiersFiliere) : poids fixe 0.12 (supplémentaires, moins fiables
 * comme proxy de l'orientation principale).
 *
 * penalite = Σ(poids des items matchants) / Σ(tous les poids)  — capped [0, 1]
 *
 * Interprétation :
 *   0.0  → aucun match rejet
 *   0.25 → rejet marginal (1 debouché secondaire sur ~12 matche)
 *   0.85 → rejet fort    (debouché principal matche)
 *   1.0  → rejet total   (tous les debouchés matchent)
 *
 * @param {string[]} rejette       Termes rejetés (extraits par Gemini)
 * @param {object[]} metiersFiliere Métiers structurés ({ nom: string })
 * @param {string}   debouches     Champ texte brut "item1; item2; …"
 * @returns {number} pénalité dans [0, 1]
 */
function calculerPenaliteRejet(rejette, metiersFiliere, debouches) {
  if (!rejette || rejette.length === 0) return 0;

  const items = splitItems(debouches);
  const nomsMetiers = (metiersFiliere || []).map((m) => m.nom || "").filter(Boolean);

  if (items.length === 0 && nomsMetiers.length === 0) return 0;

  const POIDS_POSITION = [1.00, 0.75, 0.55, 0.40];
  const POIDS_PLANCHER = 0.25;
  const POIDS_METIER   = 0.12;
  const poidsItem = (i) => (i < POIDS_POSITION.length ? POIDS_POSITION[i] : POIDS_PLANCHER);

  let sommePoidsTotal = 0;
  let sommePoidsMatch = 0;

  for (let i = 0; i < items.length; i++) {
    const p = poidsItem(i);
    sommePoidsTotal += p;
    if (itemMatcheRejet(items[i], rejette)) sommePoidsMatch += p;
  }
  for (const nom of nomsMetiers) {
    sommePoidsTotal += POIDS_METIER;
    if (itemMatcheRejet(nom, rejette)) sommePoidsMatch += POIDS_METIER;
  }

  if (sommePoidsMatch === 0 || sommePoidsTotal === 0) return 0;
  return Math.min(1.0, sommePoidsMatch / sommePoidsTotal);
}

/**
 * Calcule le score composite d'une filière éligible.
 *
 * @param {object} r               Résultat issu de filtrer() (filiere, moyenne, risqueIAmoyen…)
 * @param {number|null} similarite Similarité cosinus [0-1] de l'aspiration (null si non calculée)
 * @param {object} poids           Pondérations depuis donnees.poids
 * @param {object} [options]       Options : { rejette, metiersFiliere, debouches }
 * @returns {{ score: number, detail: object, rejetDetecte: boolean }}
 */
export function calculerScoreComposite(r, similarite, poids, options = {}) {
  const { rejette = [], metiersFiliere = [], debouches = "", seuils = {} } = options;
  const seuilSuffisance = seuils.suffisance_academique ?? 13;

  // ── score_affinite_reve ───────────────────────────────────────────────────
  // Similarité cosinus si aspiration saisie, sinon 0.5 (neutre — pas de pénalité).
  let sAffinite = similarite != null && Number.isFinite(similarite)
    ? Math.min(1, Math.max(0, similarite))
    : 0.5;

  // Pénalité de rejet GRADUÉE : réduit sAffinite proportionnellement à la position
  // et la fréquence des débouchés qui matchent un terme rejeté.
  //   sAffinite_finale = sAffinite_base × (1 - penalite)
  // Jamais d'écrasement brutal à une valeur fixe.
  // Le badge "débouché non souhaité" s'affiche seulement si la pénalité est ≥ 25%
  // (évite d'alarmer pour un rejet marginal portant sur 1 item secondaire sur 15).
  const penaliteRejet = calculerPenaliteRejet(rejette, metiersFiliere, debouches);
  if (penaliteRejet > 0) sAffinite = Math.max(0, sAffinite * (1 - penaliteRejet));
  const rejetDetecte = penaliteRejet >= 0.25;

  // ── score_marge_academique ────────────────────────────────────────────────
  // Logique de "seuil de suffisance" : au-delà de seuilSuffisance (défaut 13/20),
  // l'élève "gère" et on ne le départage plus sur les notes (score = 1.0).
  // En dessous, transition linéaire continue :
  //   [10, S[  → [0.5, 1.0[   (zone de transition douce)
  //   [0,  10[ → [0.2, 0.5[   (zone insuffisante)
  // Les deux segments sont C0-continus à leurs points de jointure (10 et S).
  // Concours ou pas de notes → 0.5 (neutre, inchangé).
  let sMarge = 0.5;
  if (r.moyenne && r.moyenne.statut === "estimee" && r.moyenne.valeur != null) {
    const m = r.moyenne.valeur;
    const S = seuilSuffisance;
    if (m >= S) {
      sMarge = 1.0;
    } else if (m >= 10) {
      sMarge = 0.5 + (m - 10) / (S - 10) * 0.5;
    } else {
      sMarge = 0.2 + (m / 10) * 0.3;
    }
    sMarge = Math.min(1, Math.max(0, sMarge));
  }

  // ── score_avenir_metier ───────────────────────────────────────────────────
  // Proxy : 1 − (risque_IA_moyen / 100). Aucun métier scoré → 0.5 (neutre).
  // Ce critère pourra être enrichi avec des données d'insertion professionnelle
  // et d'employabilité réelles quand elles seront disponibles au Bénin. Pour
  // l'instant il repose uniquement sur le risque IA par famille de métiers (WEF/O*NET),
  // faute de données fiables sur le marché du travail béninois (le nombre d'entreprises
  // par secteur a été étudié comme proxy mais écarté : 86% d'informalité fausse le signal).
  let sAvenir = 0.5;
  if (r.risqueIAmoyen != null && Number.isFinite(r.risqueIAmoyen)) {
    sAvenir = Math.min(1, Math.max(0, 1 - r.risqueIAmoyen / 100));
  }

  // ── score_accessibilite_geo ───────────────────────────────────────────────
  // TODO: la ville de l'utilisateur n'est pas encore collectée dans le wizard.
  // Mettre à 0.5 (neutre) jusqu'à l'ajout d'une étape de localisation.
  //   même ville que l'étab → 1.0 | autre ville Bénin → 0.7 | non précisé → 0.5
  const sGeo = 0.5;

  // ── score_accessibilite_financiere ────────────────────────────────────────
  // Places boursières = 1.0 (accès réel possible) ; payant seul = 0.7 ; inconnu = 0.3.
  // Pondérée à 20% (v2) — reflet de l'importance réelle du coût pour les bacheliers béninois.
  let sFinancier = 0.3;
  const qB = Number(r.filiere.quota_boursiers);
  const qP = Number(r.filiere.quota_payant);
  if (qB > 0) sFinancier = 1.0;
  else if (qP > 0) sFinancier = 0.7;

  // ── score final ───────────────────────────────────────────────────────────
  const raw =
    poids.marge_academique         * sMarge     +
    poids.affinite_reve            * sAffinite  +
    poids.accessibilite_financiere * sFinancier +
    poids.avenir_metier            * sAvenir    +
    poids.accessibilite_geo        * sGeo;

  // Garde-fou absolu : jamais NaN, toujours dans [0-1].
  const score = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.5;

  return {
    score,
    detail: { sAffinite, sMarge, sAvenir, sGeo, sFinancier },
    rejetDetecte,
  };
}
