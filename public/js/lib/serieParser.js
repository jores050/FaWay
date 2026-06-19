// =============================================================================
// serieParser.js — Parsing ROBUSTE des chaînes `criteres_classement.serie_bac`
// -----------------------------------------------------------------------------
// POURQUOI ce module existe (contrainte données réelles) :
//   La colonne `serie_bac` est du TEXTE LIBRE COMPOSITE, pas un code simple.
//   Exemples réels de la base UAC :
//     "C, D"
//     "A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI"
//     "C, D, E et F"
//     "B, C, D, G2, et G3, DT/CoM"
//     "Toutes series confondues"
//
//   Un `LIKE '%D%'` matcherait à tort "DT", "DEAT", "DT/STI"... On doit donc
//   découper la chaîne en TOKENS de série isolés, puis comparer par ÉGALITÉ
//   EXACTE de token (jamais par sous-chaîne).
//
// RÈGLE absolue : on ne tronque ni ne réinterprète JAMAIS le sens d'une série.
//   Les codes composés (DT/STI, DT/CoM, G2, A1...) sont conservés INTACTS.
//
// Module PUR (aucune dépendance navigateur) → importable tel quel par Node pour
// les tests (voir test/serieParser.test.js).
// =============================================================================

// Détecte le cas "Toutes séries confondues" (avec/sans accents, singulier/pluriel).
const TOUTES_SERIES_REGEX = /toutes?\s+series?\s+confondues?/;

/**
 * Un fragment ressemble-t-il à un CODE de série ? (sert à désambiguïser " et ".)
 *   - codes simples : A1, A2, B, C, D, E, F, F1…F4, G1…G3, H, EA, DEAT, DT…
 *   - codes composés DT/xxx, DEAT/xxx : DT/STI, DT/CoM, DT/IMI, DEAT/PV, DEAT/Peche…
 * Un mot descriptif comme "aquaculture", "Technologie", "Travaux" ne matche PAS.
 */
function estCodeSerie(fragment) {
  const t = String(fragment || "").trim();
  if (/^[A-Z]{1,4}\d{0,2}$/.test(t)) return true;
  if (/^(DT|DEAT)\/[A-Za-z0-9]+$/.test(t)) return true;
  return false;
}

/**
 * Retire les accents (pour des comparaisons stables : "séries" -> "series").
 * @param {string} s
 * @returns {string}
 */
function stripAccents(s) {
  // Décompose (é -> e + ́) puis retire les marques diacritiques combinantes.
  // \p{Diacritic} (flag u) évite d'écrire le bloc combinant en littéral.
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Normalise un token de série pour la COMPARAISON uniquement (pas l'affichage) :
 * trim, accents retirés, espaces compactés, casse haute. On conserve le "/"
 * (intra-token, ex. "DT/STI") et les chiffres (ex. "G2").
 * @param {string} token
 * @returns {string}
 */
function normalizeToken(token) {
  return stripAccents(String(token))
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Parse une chaîne `serie_bac` brute en structure exploitable.
 *
 * @param {string|null|undefined} serieBacText
 * @returns {{ toutesSeries: boolean, tokens: string[] }}
 *   - toutesSeries=true  -> la filière accepte toutes les séries (wildcard).
 *   - tokens             -> liste des codes de série isolés, dans leur forme
 *                           d'affichage d'origine (ex. ["A1","B","DT/STI"]).
 */
export function parse(serieBacText) {
  if (serieBacText == null) return { toutesSeries: false, tokens: [] };

  const raw = String(serieBacText).trim();
  if (raw === "") return { toutesSeries: false, tokens: [] };

  // Wildcard : "Toutes series confondues" (et variantes accentuées).
  if (TOUTES_SERIES_REGEX.test(stripAccents(raw).toLowerCase())) {
    return { toutesSeries: true, tokens: [] };
  }

  // 1) Retire les qualificatifs entre parenthèses, ex. "(toutes specialites)".
  const sansParens = raw.replace(/\([^)]*\)/g, " ");

  // 2) La virgule est TOUJOURS un séparateur. " et " est AMBIGU : séparateur dans
  //    "G2 et G3" / "DT/Musique et DT/MAO", mais interne à un nom composé dans
  //    "DEAT/Peche et aquaculture" ou "Nutrition et Technologie Alimentaire".
  //    On ne coupe sur " et " QUE si ce qui suit ressemble à un code de série.
  const normalise = sansParens.replace(/\s+et\s+/gi, (m, offset, full) => {
    const apres = full.slice(offset + m.length);
    const premierMot = apres.split(/[\s,]+/).filter(Boolean)[0] || "";
    return estCodeSerie(premierMot) ? "," : m; // sinon on garde " et " (nom composé)
  });

  // 3) Découpe sur les virgules, nettoie, retire les vides ("G2, et G3" -> "G2,,G3").
  const tokens = normalise
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return { toutesSeries: false, tokens };
}

/**
 * Indique si la série choisie par l'utilisateur (ex. "D") correspond à une
 * chaîne `serie_bac`. Vrai si la filière accepte toutes les séries, sinon
 * ÉGALITÉ EXACTE de token (jamais une sous-chaîne -> "D" ne matche pas "DT/STI").
 *
 * @param {string} codeChoisi  Code de série sélectionné par l'utilisateur.
 * @param {string} serieBacText  Chaîne brute issue de la base.
 * @returns {boolean}
 */
export function matchSerie(codeChoisi, serieBacText) {
  const { toutesSeries, tokens } = parse(serieBacText);
  if (toutesSeries) return true;
  if (codeChoisi == null) return false;

  const cible = normalizeToken(codeChoisi);
  if (cible === "") return false;
  return tokens.some((t) => normalizeToken(t) === cible);
}

/**
 * Construit dynamiquement la liste des séries distinctes réellement présentes
 * en base, pour peupler le menu de l'étape 1 (on ne code AUCUNE liste statique).
 *
 * Les filières "Toutes séries confondues" n'apportent pas de code spécifique et
 * sont donc ignorées ici (elles seront proposées à toute série au filtrage).
 *
 * @param {Array<{serie_bac?: string}|string>} rows
 *   Lignes `criteres_classement` (ou chaînes brutes) dont on extrait les séries.
 * @returns {string[]} Codes de série distincts, triés, en forme d'affichage.
 */
export function extractSeriesDistinctes(rows) {
  // Map clé normalisée -> forme d'affichage (première rencontrée), pour dédupliquer
  // sans écraser la casse/accents d'origine.
  const parNorme = new Map();

  for (const row of rows || []) {
    const texte = typeof row === "string" ? row : row && row.serie_bac;
    const { tokens } = parse(texte);
    for (const tok of tokens) {
      const cle = normalizeToken(tok);
      if (cle !== "" && !parNorme.has(cle)) parNorme.set(cle, tok);
    }
  }

  return Array.from(parNorme.values()).sort((a, b) =>
    normalizeToken(a).localeCompare(normalizeToken(b), "fr")
  );
}

// Exposé pour les tests / usages avancés (comparaison de tokens).
export { normalizeToken };
