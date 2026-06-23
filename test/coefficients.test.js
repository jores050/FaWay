/**
 * Tests de la formule de classement officielle.
 * Source : guide d'orientation du Ministère, page 8.
 *
 * Usage : node test/coefficients.test.js
 */

import { trouverCoefficient, SERIES_VALIDES } from "../public/js/lib/coefficients.js";

let echecs = 0;
function assert(label, obtenu, attendu, tolerance = 0.005) {
  const ok = Math.abs(obtenu - attendu) <= tolerance;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) {
    console.error(`    attendu: ${attendu}  obtenu: ${obtenu}`);
    echecs++;
  }
}

// ── Helper : reproduit calculerMoyenneClassement pour les tests ──────────────
function calculer(matieres, notes, serie) {
  const detail = [];
  for (const m of matieres) {
    const res = trouverCoefficient(m, serie);
    if (!res) throw new Error(`Coefficient introuvable : "${m}" / "${serie}"`);
    detail.push({ matiere: m, note: notes[m], coef: res.coef });
  }
  const sommeCoefs = detail.reduce((s, d) => s + d.coef, 0);
  const somme = detail.reduce((s, d) => s + d.note * d.coef, 0);
  return { valeur: somme / sommeCoefs, sommeCoefs, detail };
}

// ── Test 1 : Médecine, Bac D ──────────────────────────────────────────────────
// M = (SVT×5 + Maths×4 + PCT×4) / 13 = (14×5 + 11×4 + 12×4) / 13 = 162/13
const notes = { SVT: 14, Maths: 11, PCT: 12 };
const r1 = calculer(["SVT", "Maths", "PCT"], notes, "D");
assert("Bac D — somme des coefs = 13", r1.sommeCoefs, 13, 0);
assert("Bac D — M = 162/13 ≈ 12.46", r1.valeur, 162 / 13);

// ── Test 2 : Médecine, Bac C ──────────────────────────────────────────────────
// M = (SVT×2 + Maths×6 + PCT×5) / 13 = (14×2 + 11×6 + 12×5) / 13 = 154/13
const r2 = calculer(["SVT", "Maths", "PCT"], notes, "C");
assert("Bac C — somme des coefs = 13", r2.sommeCoefs, 13, 0);
assert("Bac C — M = 154/13 ≈ 11.85", r2.valeur, 154 / 13);

// Résultats D ≠ C (les coefficients diffèrent)
assert("D vs C : résultats distincts", +(r1.valeur !== r2.valeur), 1, 0);

// ── Test 3 : mapping PCT/SPCT → Sciences Physiques ────────────────────────────
const coefPCT  = trouverCoefficient("PCT",  "D");
const coefSPCT = trouverCoefficient("SPCT", "D");
assert("PCT  → Sciences Physiques (Bac D, coef 4)", coefPCT?.coef  ?? 0, 4, 0);
assert("SPCT → Sciences Physiques (Bac D, coef 4)", coefSPCT?.coef ?? 0, 4, 0);

// ── Test 4 : matière inconnue retourne null ───────────────────────────────────
const inconnu = trouverCoefficient("Culture Générale", "D");
assert("Matière inconnue → null", inconnu === null ? 1 : 0, 1, 0);

// ── Test 5 : série inconnue retourne null ─────────────────────────────────────
const serieInconnue = trouverCoefficient("Maths", "Z99");
assert("Série inconnue → null", serieInconnue === null ? 1 : 0, 1, 0);

// ── Test 6 : série technique F3 (bug "série Maths") ──────────────────────────
// Génie Énergétique INSTI : matière "Electrotechnique" doit trouver coef 3 en F3.
const coefElectroF3 = trouverCoefficient("Electrotechnique", "F3");
assert("F3 — Electrotechnique coef = 3", coefElectroF3?.coef ?? 0, 3, 0);

// Vérification que "Maths" passé en position SÉRIE déclenche null (garde-fou).
const matierePasSerieF3 = trouverCoefficient("Electrotechnique", "Maths");
assert("'Maths' passé comme série → null (garde-fou)", matierePasSerieF3 === null ? 1 : 0, 1, 0);

// ── Test 7 : SERIES_VALIDES contient exactement les 14 séries connues ─────────
assert("SERIES_VALIDES contient 14 séries", SERIES_VALIDES.size, 14, 0);
assert("SERIES_VALIDES inclut F3", SERIES_VALIDES.has("F3") ? 1 : 0, 1, 0);
assert("SERIES_VALIDES exclut 'Maths'", SERIES_VALIDES.has("Maths") ? 0 : 1, 1, 0);

// ── Test 8 : séries G (gestion) ───────────────────────────────────────────────
const coefEtudeCasG2 = trouverCoefficient("Etude de Cas", "G2");
assert("G2 — Etude de Cas coef = 6", coefEtudeCasG2?.coef ?? 0, 6, 0);

// ── Bilan ─────────────────────────────────────────────────────────────────────
console.log("");
if (echecs === 0) {
  console.log("Tous les tests passent.");
} else {
  console.error(`${echecs} test(s) échoué(s).`);
  process.exit(1);
}
