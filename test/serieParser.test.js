// =============================================================================
// test/serieParser.test.js — Tests du parsing `serie_bac` (exécutables avec Node)
// -----------------------------------------------------------------------------
//   node test/serieParser.test.js      (ou : npm test)
//
// Petit harnais maison (aucune dépendance) : on teste les cas RÉELS imposés par
// la spec + le cas négatif critique "D" ⊄ "DT/STI"/"DEAT" qui justifie tout ce
// module (un LIKE '%D%' échouerait ici).
// =============================================================================

import {
  parse,
  matchSerie,
  extractSeriesDistinctes,
} from "../public/js/lib/serieParser.js";

let passed = 0;
let failed = 0;

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}\n      attendu : ${e}\n      obtenu  : ${a}`);
  }
}

// --- parse() : tokens isolés -------------------------------------------------
console.log("parse() — découpage en tokens isolés");
eq(parse("C, D").tokens, ["C", "D"], '"C, D"');
eq(
  parse("A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI").tokens,
  ["A1", "A2", "B", "C", "D", "DEAT", "DT/STI"],
  '"A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI"'
);
eq(parse("C, D, E et F").tokens, ["C", "D", "E", "F"], '"C, D, E et F"');
eq(
  parse("B, C, D, G2, et G3, DT/CoM").tokens,
  ["B", "C", "D", "G2", "G3", "DT/CoM"],
  '"B, C, D, G2, et G3, DT/CoM"'
);
eq(
  parse("DEAT (toutes specialites) et DT/STI").tokens,
  ["DEAT", "DT/STI"],
  '"DEAT (toutes specialites) et DT/STI" (cas négatif)'
);

// --- parse() : wildcard "Toutes series confondues" ---------------------------
console.log("parse() — wildcard toutes séries");
eq(
  parse("Toutes series confondues"),
  { toutesSeries: true, tokens: [] },
  '"Toutes series confondues" -> wildcard'
);
eq(
  parse("Toutes séries confondues").toutesSeries,
  true,
  'variante accentuée "Toutes séries confondues"'
);

// --- parse() : " et " ambigu (vrais cas de la base) -------------------------
// " et " est un SÉPARATEUR entre codes, mais INTERNE à un nom de spécialité composé.
console.log("parse() — désambiguïsation de \" et \" (données réelles)");
eq(
  parse("A1, A2, B, C, D, DT/Musique et DT/MAO").tokens,
  ["A1", "A2", "B", "C", "D", "DT/Musique", "DT/MAO"],
  '" et " séparateur entre deux codes DT/…'
);
eq(
  parse("C, D, DEAT/Nutrition et Technologie Alimentaire").tokens,
  ["C", "D", "DEAT/Nutrition et Technologie Alimentaire"],
  '" et " interne à un nom composé (Nutrition et Technologie Alimentaire)'
);
eq(
  parse("C, D et DEAT/Peche et aquaculture").tokens,
  ["C", "D", "DEAT/Peche et aquaculture"],
  'mélange : 1er " et " sépare, 2e " et " est interne'
);
eq(
  parse("C, D, E, F4, DT Batiments et Travaux publics").tokens,
  ["C", "D", "E", "F4", "DT Batiments et Travaux publics"],
  'spécialité composée gardée intacte (pas de fragment "Travaux publics")'
);
eq(
  matchSerie("D", "C, D, DEAT/Nutrition et Technologie Alimentaire"),
  true,
  'D matche même avec une spécialité composée dans la chaîne'
);
eq(
  matchSerie("DT/MAO", "A1, A2, B, C, D, DT/Musique et DT/MAO"),
  true,
  "DT/MAO matche exactement (token isolé après split conditionnel)"
);

// --- matchSerie() : ÉGALITÉ EXACTE, jamais sous-chaîne -----------------------
console.log('matchSerie("D", …) — égalité exacte de token');
eq(matchSerie("D", "C, D"), true, '"C, D" contient D');
eq(
  matchSerie("D", "A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI"),
  true,
  "chaîne longue contient D"
);
eq(matchSerie("D", "C, D, E et F"), true, '"C, D, E et F" contient D');
eq(matchSerie("D", "B, C, D, G2, et G3, DT/CoM"), true, "contient D");
eq(matchSerie("D", "Toutes series confondues"), true, "wildcard accepte D");
// LE test qui justifie le module : D ne doit PAS matcher DT/DEAT/DT/STI.
eq(
  matchSerie("D", "DEAT (toutes specialites) et DT/STI"),
  false,
  "D ⊄ {DEAT, DT/STI} (anti-faux-positif)"
);
eq(matchSerie("D", "DT/CoM"), false, "D ⊄ DT/CoM");
eq(matchSerie("DT/STI", "DEAT et DT/STI"), true, "DT/STI matche exactement");

// --- extractSeriesDistinctes() : menu dynamique ------------------------------
console.log("extractSeriesDistinctes() — séries distinctes triées");
eq(
  extractSeriesDistinctes([
    { serie_bac: "C, D" },
    { serie_bac: "C, D, E et F" },
    { serie_bac: "A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI" },
    { serie_bac: "Toutes series confondues" }, // ignorée (pas de code précis)
  ]),
  ["A1", "A2", "B", "C", "D", "DEAT", "DT/STI", "E", "F"],
  "union triée, wildcard ignoré"
);

// --- Bilan -------------------------------------------------------------------
console.log(`\n${passed} réussis, ${failed} échoués`);
if (failed > 0) process.exit(1);
