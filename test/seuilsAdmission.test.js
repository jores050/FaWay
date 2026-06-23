/**
 * Tests des chances d'admission estimées.
 * Usage : node test/seuilsAdmission.test.js
 */
import { calculerPourcentage, determinerZone, classerFiliere, calculerChancesAdmission, SEUILS } from "../public/js/lib/seuilsAdmission.js";

let echecs = 0;
function assert(label, obtenu, attendu) {
  const ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) { console.error(`    attendu: ${JSON.stringify(attendu)}  obtenu: ${JSON.stringify(obtenu)}`); echecs++; }
}
function assertPct(label, obtenu, attendu) {
  const ok = obtenu === attendu;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) { console.error(`    attendu: ${attendu}%  obtenu: ${obtenu}%`); echecs++; }
}

// ── Test 1 : moyenne = seuil (Médecine seuil 14) → 50% zone limite ──────────
assertPct("Test 1 — m=14 seuil=14 → 50%", calculerPourcentage(14, 14), 50);
assert("Test 1 — zone 50% → limite", determinerZone(50), "limite");

// ── Test 2 : m=16 seuil=14 → 50 + 2×12 = 74% zone favorable ────────────────
assertPct("Test 2 — m=16 seuil=14 → 74%", calculerPourcentage(16, 14), 74);
assert("Test 2 — zone 74% → favorable", determinerZone(74), "favorable");

// ── Test 3 : m=11 seuil=14 → 50 - 3×12 = 14% zone difficile ────────────────
assertPct("Test 3 — m=11 seuil=14 → 14%", calculerPourcentage(11, 14), 14);
assert("Test 3 — zone 14% → difficile", determinerZone(14), "difficile");

// ── Test 4 : m=12 seuil=11 → 50 + 1×12 = 62% zone limite ───────────────────
assertPct("Test 4 — m=12 seuil=11 → 62%", calculerPourcentage(12, 11), 62);
assert("Test 4 — zone 62% → limite", determinerZone(62), "limite");

// ── Test 5 : filière à concours → non applicable ────────────────────────────
const rConcours = { filiere: { intitule: "Médecine", mode_entree: "Concours" }, etablissement: null, moyenne: { statut: "estimee", valeur: 15 } };
assert("Test 5 — concours → applicable:false, raison:concours", calculerChancesAdmission(rConcours).applicable, false);
assert("Test 5 — concours → raison concours", calculerChancesAdmission(rConcours).raison, "concours");

// ── Test 6 : sans notes → non applicable ────────────────────────────────────
const rSansNotes = { filiere: { intitule: "Gestion", mode_entree: "Classement" }, etablissement: null, moyenne: { statut: "nonSaisi", valeur: null } };
assert("Test 6 — sans notes → applicable:false", calculerChancesAdmission(rSansNotes).applicable, false);

// ── Classification : règles clés ────────────────────────────────────────────
assert("Médecine → seuil 14", classerFiliere("Médecine Générale", null, null), SEUILS.TRES_DEMANDEE);
assert("Pharmacie → seuil 14", classerFiliere("Pharmacie", null, null), SEUILS.TRES_DEMANDEE);
assert("Droit → seuil 14", classerFiliere("Droit Privé", null, null), SEUILS.TRES_DEMANDEE);
assert("Génie Civil EPAC → seuil 14", classerFiliere("Génie Civil", "EPAC", "EPAC"), SEUILS.TRES_DEMANDEE);
assert("Génie Civil UNSTIM → seuil 12", classerFiliere("Génie Civil", "UNSTIM", "UNSTIM"), SEUILS.DEMANDEE);
assert("Informatique IFRI → seuil 14", classerFiliere("Informatique", "IFRI", "IFRI"), SEUILS.TRES_DEMANDEE);
assert("Gestion → seuil 12", classerFiliere("Gestion des Entreprises", null, null), SEUILS.DEMANDEE);
assert("Philosophie → seuil 10", classerFiliere("Philosophie", null, null), SEUILS.PEU_DEMANDEE);
assert("Histoire seule → seuil 10", classerFiliere("Histoire", null, null), SEUILS.PEU_DEMANDEE);
assert("Histoire-Géographie → seuil 11 (défaut)", classerFiliere("Histoire-Géographie", null, null), SEUILS.MOYENNE);
assert("Agronomie → seuil 11 (défaut)", classerFiliere("Agronomie", null, null), SEUILS.MOYENNE);

// ── Bornes plafond/plancher ──────────────────────────────────────────────────
assertPct("Plancher : m=0 seuil=14 → max 5%", calculerPourcentage(0, 14), 5);
assertPct("Plafond  : m=20 seuil=10 → max 95%", calculerPourcentage(20, 10), 95);

console.log("");
if (echecs === 0) { console.log("Tous les tests passent."); }
else { console.error(`${echecs} test(s) échoué(s).`); process.exit(1); }
