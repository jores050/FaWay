// =============================================================================
// test/aspiration.test.js — Pertinence de l'aspiration (Node)
//   node test/aspiration.test.js   (ou : npm test)
// =============================================================================

import {
  analyserAspiration,
  scoreAspiration,
  racineMatch,
} from "../public/js/lib/aspiration.js";

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

// --- racineMatch (pluriels / dérivés) ---------------------------------------
console.log("racineMatch — racine commune");
eq(racineMatch("art", "arts"), true, "art ~ arts (pluriel)");
eq(racineMatch("droit", "droits"), true, "droit ~ droits");
eq(racineMatch("gestion", "gestionnaire"), true, "gestion ~ gestionnaire (préfixe)");
eq(racineMatch("informaticien", "informatique"), true, "informaticien ~ informatique (racine longue)");
eq(racineMatch("comptable", "comptabilite"), true, "comptable ~ comptabilite");
eq(racineMatch("droit", "gestion"), false, "droit ≁ gestion");
eq(racineMatch("art", "depart"), false, "art ≁ depart (pas de faux positif sous-chaîne)");

// --- analyserAspiration (mots + expansion lexique) --------------------------
console.log("analyserAspiration — nettoyage + synonymes");
{
  const a = analyserAspiration("je veux soigner les gens malades");
  eq(a.mots.includes("veux") || a.mots.includes("les") || a.mots.includes("gens"), false, "stop-words retirés");
  eq(a.mots.includes("soigner") && a.mots.includes("malades"), true, "mots utiles gardés");
  eq(a.termes.includes("medecine") && a.termes.includes("sante"), true, "expansion santé via lexique");
}
eq(analyserAspiration("").mots, [], "texte vide -> aucun mot");
eq(analyserAspiration("je veux faire").mots, [], "que des stop-words -> aucun mot utile");

// --- scoreAspiration (pondération intitulé > débouchés) ---------------------
console.log("scoreAspiration — pertinence pondérée");
const MEDECINE = { intitule: "Medecine Generale", debouches: "Medecin general; Chirurgien" };
const DROIT = { intitule: "Droit", debouches: "Avocat; Juriste; Magistrat" };
{
  const { termes } = analyserAspiration("soigner les malades");
  const sMed = scoreAspiration(MEDECINE, termes);
  const sDroit = scoreAspiration(DROIT, termes);
  eq(sMed > 0, true, "Médecine pertinente pour « soigner »");
  eq(sDroit, 0, "Droit non pertinent pour « soigner »");
  eq(sMed > sDroit, true, "Médecine classée avant Droit");
}
{
  const { termes } = analyserAspiration("devenir avocat");
  eq(scoreAspiration(DROIT, termes) > 0, true, "« avocat » -> Droit pertinent (débouchés)");
}
eq(scoreAspiration(MEDECINE, []), 0, "aucun terme -> score 0");

console.log(`\n${passed} réussis, ${failed} échoués`);
if (failed > 0) process.exit(1);
