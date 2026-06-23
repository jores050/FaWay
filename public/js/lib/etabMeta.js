// =============================================================================
// lib/etabMeta.js — Déduction fiable des métadonnées d'établissement
// -----------------------------------------------------------------------------
// Tout retourne null si la valeur n'est pas déductible de façon certaine.
// JAMAIS d'invention : null → la ligne sera masquée par l'appelant.
// =============================================================================

// Supprime les diacritiques pour des comparaisons robustes ("Ecole" = "École").
const norm = (s) =>
  String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Villes UAC connues, du plus long au plus court pour éviter qu'Abomey matche
// avant Abomey-Calavi.
const VILLES = [
  "Abomey-Calavi",
  "Porto-Novo",
  "Natitingou",
  "Lokossa",
  "Cotonou",
  "Parakou",
  "Bohicon",
  "Abomey",
];

// Secours par sigle pour les établissements dont le nom ne contient pas la ville.
const VILLE_PAR_SIGLE = {
  INSTI:  "Lokossa",
  ENSET:  "Lokossa",
  ENSTP:  "Abomey",
  ENSGEP: "Abomey",
  ENSGMM: "Abomey",
  INSPEI: "Abomey",
};

/**
 * Extrait le sigle entre la dernière paire de parenthèses si le contenu
 * est entièrement en majuscules (lettres, chiffres, "/" ou "-").
 * Ex : "École Polytechnique d'Abomey-Calavi (EPAC)" → "EPAC"
 */
export function extraireSimgle(nom) {
  if (!nom) return null;
  const m = nom.match(/\(([A-Z][A-Z0-9/\-]*)\)\s*$/);
  return m ? m[1] : null;
}

/**
 * Déduit la ville de l'établissement à partir du nom ou d'une table connue.
 * null si introuvable.
 */
export function deduireVille(nom, sigle) {
  for (const v of VILLES) {
    if ((nom || "").includes(v)) return v;
  }
  return sigle ? (VILLE_PAR_SIGLE[sigle] ?? null) : null;
}

/**
 * Déduit le niveau / type de formation.
 *
 * Règles (par ordre de priorité) :
 *   1. INSPEI / IMSP / "classe préparatoire" dans l'intitulé → Classe préparatoire
 *   2. EPAC                                                   → Licence pro ou cycle ingénieur
 *   3. Nom normalisé contient le mot "faculte"                → Licence
 *   4. Nom normalisé contient "ecole", "institut", "centre"
 *      ou "haute ecole"                                       → Licence professionnelle
 *
 * La normalisation (suppression des diacritiques) garantit qu'
 * "Ecole" et "École" sont traités identiquement, et que "\bfaculte\b"
 * matche correctement (sans le problème du \b avec les caractères accentués).
 */
export function deduireNiveau(etabNom, sigle, intitule) {
  const s = (sigle || "").toUpperCase();
  const e = norm(etabNom || "");
  const i = norm(intitule || "");

  // Classe préparatoire
  if (s === "INSPEI" || s === "IMSP" || /classe preparatoire|prepa\b/.test(i)) {
    return "Classe préparatoire";
  }

  // EPAC — cycle mixte licence/ingénieur
  if (s === "EPAC") return "Licence professionnelle ou cycle ingénieur";

  // Toutes les Facultés → Licence académique
  if (/\bfaculte\b/.test(e)) return "Licence";

  // Écoles, Instituts, Centres, Hautes Écoles → Licence professionnelle
  if (/\becole\b|\binstitut\b|\bcentre\b|haute ecole/.test(e)) {
    return "Licence professionnelle";
  }

  return null;
}

/**
 * Déduit la durée indicative à partir du niveau.
 *   Classe préparatoire              → "2 ans"
 *   Licence pro ou cycle ingénieur   → "3 ans (licence) ou 5 ans (ingénieur)"
 *   Licence / Licence professionnelle → "3 ans"
 */
export function deduireDuree(niveau) {
  if (!niveau) return null;
  if (/preparatoire|préparatoire/i.test(niveau)) return "2 ans";
  if (/ingenieur|ingénieur/i.test(niveau))       return "3 ans (licence) ou 5 ans (ingénieur)";
  if (/licence/i.test(niveau))                   return "3 ans";
  return null;
}
