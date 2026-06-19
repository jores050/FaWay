// =============================================================================
// test/matiereResolver.test.js — Résolution des matières conditionnelles (Node)
//   node test/matiereResolver.test.js   (ou : npm test)
//
// Données RÉELLES de la base (page source entre parenthèses) — vérifiées via
// l'API REST le 2026-06-18. La déduplication se fait sur le résultat RÉSOLU.
// =============================================================================

import { resoudreMatiere } from "../public/js/lib/matiereResolver.js";
import { matchSerie } from "../public/js/lib/serieParser.js";

let passed = 0,
  failed = 0;
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

// Reproduit la logique d'étape 2 pour UNE filière : garder les lignes dont la
// série matche, résoudre chaque matière, dédupliquer.
function champsFiliere(rows, serie) {
  const out = [];
  for (const r of rows) {
    if (!matchSerie(serie, r.serie)) continue;
    const v = resoudreMatiere(r.mat, serie);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

// --- Unitaires par format ---------------------------------------------------
console.log("resoudreMatiere — par format");
eq(resoudreMatiere("Maths", "C"), "Maths", "défaut : pas de parenthèse -> brut");
eq(resoudreMatiere("PCT (Maths pour A)", "A1"), "Maths", "F1 : A -> Maths");
eq(resoudreMatiere("PCT (Maths pour A)", "C"), "PCT", "F1 : C -> base PCT");
eq(
  resoudreMatiere("SVT (Mobilisation des ressources en eau pour EA)", "EA"),
  "Mobilisation des ressources en eau",
  "F1 : EA -> alternative"
);
eq(
  resoudreMatiere("PCT (LV1 pour A et Economie pour B)", "B"),
  "Economie",
  "F1 multi-clauses : B -> Economie"
);
eq(resoudreMatiere("PCT (LV1 pour A et Economie pour B)", "D"), "PCT", "F1 multi : D -> base");
eq(resoudreMatiere("Hist-Geo/Anglais (DT/STI)", "DT/STI"), "Anglais", "F2 : DT/STI -> 2e partie");
eq(resoudreMatiere("Hist-Geo/Anglais (DT/STI)", "C"), "Hist-Geo", "F2 : C -> 1re partie");
eq(resoudreMatiere("Maths ou Etude de Cas (G)", "G2"), "Etude de Cas", "F3 : G2 -> alternative");
eq(resoudreMatiere("Maths ou Etude de Cas (G)", "C"), "Maths", "F3 : C -> base");
eq(resoudreMatiere("Anglais ou Francais (E et F)", "E"), "Francais", "F3 : E -> alternative");
eq(
  resoudreMatiere("Economie (B) / Maths (C-D) / Etude de Cas (G)", "C"),
  "Maths",
  "F4 : C -> Maths"
);
eq(
  resoudreMatiere("Economie (B) / Maths (C-D) / Etude de Cas (G)", "G3"),
  "Etude de Cas",
  "F4 : G3 -> Etude de Cas"
);
eq(resoudreMatiere("Philo (A) ou SVT (C,D)", "C"), "SVT", "F4 (ou) : C -> SVT");
eq(resoudreMatiere("Anglais (LV1)", "C"), "Anglais", "qualifiant non conditionnel -> base");

// --- Robustesse : non-applicable (drop) + qualificatifs LV1/LV2 par défaut -----
console.log("resoudreMatiere — robustesse (anomalies étape 2)");
eq(resoudreMatiere("Économie (B) ou Maths (C-D) ou Étude de cas (G)", "E"), "", "hors B/C-D/G -> NON applicable (vide -> ignoré)");
eq(resoudreMatiere("Économie (B) ou Maths (C-D) ou Étude de cas (G)", "C"), "Maths", "C -> Maths");
eq(resoudreMatiere("Anglais (LV2) ou Hist-Géo (B)", "A1"), "Anglais", "LV2 = qualificatif -> défaut Anglais (A1 ≠ B)");
eq(resoudreMatiere("Anglais (LV2) ou Hist-Géo (B)", "B"), "Hist-Géo", "B -> Hist-Géo");
eq(resoudreMatiere("Anglais / Français", "E"), "Anglais / Français", "choix de langue sans condition -> conservé");

// --- Cas obligatoires : filières réelles ------------------------------------
console.log("Filières réelles (≤ 3 champs chacune)");
const ASSURANCE = [
  { serie: "C, D, G2, G3", mat: "Maths ou Etude de Cas (G)" },
  { serie: "C, D, G2, G3", mat: "Francais" },
  { serie: "C, D, G2, G3", mat: "Anglais" },
];
eq(champsFiliere(ASSURANCE, "C"), ["Maths", "Francais", "Anglais"], "Assurance / C");
eq(champsFiliere(ASSURANCE, "G2"), ["Etude de Cas", "Francais", "Anglais"], "Assurance / G2");

const SERIE_GEO = "A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI";
const GEO = [
  { serie: SERIE_GEO, mat: "Francais" },
  { serie: SERIE_GEO, mat: "Hist-Geo/Anglais (DT/STI)" },
  { serie: SERIE_GEO, mat: "Maths" },
];
eq(champsFiliere(GEO, "C"), ["Francais", "Hist-Geo", "Maths"], "Géographie / C (pas de doublon)");
eq(champsFiliere(GEO, "DT/STI"), ["Francais", "Anglais", "Maths"], "Géographie / DT/STI résolu");

const ENV = [
  { serie: "A1, A2, B, C, D, EA", mat: "SVT (Mobilisation des ressources en eau pour EA)" },
  { serie: "A1, A2, B, C, D, EA", mat: "PCT (LV1 pour A et Economie pour B)" },
  { serie: "A1, A2, B, C, D, EA", mat: "Hist-Geo (Assainissement pour EA)" },
];
eq(champsFiliere(ENV, "C"), ["SVT", "PCT", "Hist-Geo"], "Environnement / C (pas EA/A/B)");
eq(
  champsFiliere(ENV, "EA"),
  ["Mobilisation des ressources en eau", "PCT", "Assainissement"],
  "Environnement / EA résolu"
);

const MARKETING = [
  { serie: "B, C, D, G2, G3, DT/CoM", mat: "Economie (B) / Maths (C-D) / Etude de Cas (G)" },
  { serie: "B, C, D, G2, G3, DT/CoM", mat: "Francais" },
  { serie: "B, C, D, G2, G3, DT/CoM", mat: "Anglais (LV pour B)" },
];
eq(champsFiliere(MARKETING, "C"), ["Maths", "Francais", "Anglais"], "Marketing / C (F4 résolu)");

// Garde-fou : aucune filière ne doit produire > 3 champs.
for (const [nom, rows, serie] of [
  ["Assurance", ASSURANCE, "C"],
  ["Géographie", GEO, "C"],
  ["Environnement", ENV, "C"],
  ["Marketing", MARKETING, "C"],
]) {
  const n = champsFiliere(rows, serie).length;
  eq(n <= 3, true, `${nom} : ${n} champ(s) ≤ 3`);
}

console.log(`\n${passed} réussis, ${failed} échoués`);
if (failed > 0) process.exit(1);
