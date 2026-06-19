// =============================================================================
// test/filtrage.test.js — Tests du moteur engine/filtrage.js (Node)
// -----------------------------------------------------------------------------
//   node test/filtrage.test.js   (ou : npm run test:engine)
//
// Fixtures SYNTHÉTIQUES (uniquement pour les tests — l'app, elle, ne lit que
// Supabase). On vérifie : éligibilité par token isolé, filière "toutes séries",
// estimation non pondérée (complète / incomplète / sans matière / non saisie),
// tri par quota_boursiers, et filtrage par mots-clés de l'aspiration.
// =============================================================================

import { filtrer, matieresPourSerie } from "../public/js/engine/filtrage.js";

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

// --- Construction d'un bundle "donnees" au même format que chargerDonnees() ---
function bundle(filieres, criteres) {
  const criteresParFiliere = new Map();
  for (const c of criteres) {
    if (!criteresParFiliere.has(c.filiere_id)) criteresParFiliere.set(c.filiere_id, []);
    criteresParFiliere.get(c.filiere_id).push(c);
  }
  return {
    filieres,
    criteres,
    filiereParId: new Map(filieres.map((f) => [f.id, f])),
    etabParId: new Map([["e1", { id: "e1", nom: "FAST", ville: "Calavi" }]]),
    criteresParFiliere,
  };
}

const filieres = [
  { id: "f1", intitule: "Informatique", etablissement_id: "e1", quota_boursiers: 30, quota_payant: 10, mode_entree: "Classement", debouches: "Developpeur; Analyste" },
  { id: "f2", intitule: "Droit", etablissement_id: "e1", quota_boursiers: 50, quota_payant: 20, mode_entree: "Classement", debouches: "Avocat; Juriste" },
  { id: "f3", intitule: "Langue Chinoise", etablissement_id: "e1", quota_boursiers: null, quota_payant: 5, mode_entree: null, debouches: "Traducteur" },
  { id: "f4", intitule: "Medecine", etablissement_id: "e1", quota_boursiers: 5, quota_payant: 0, mode_entree: "Classement", debouches: "Medecin" },
  { id: "f5", intitule: "Espagnol", etablissement_id: "e1", quota_boursiers: 40, quota_payant: 8, mode_entree: "Concours", debouches: "Professeur" },
];
const criteres = [
  { id: "c1", filiere_id: "f1", serie_bac: "C, D", matiere: "Maths", coefficient: null },
  { id: "c2", filiere_id: "f1", serie_bac: "C, D", matiere: "PCT", coefficient: null },
  { id: "c3", filiere_id: "f2", serie_bac: "A1, A2, B, C, D et G2", matiere: "Philosophie", coefficient: null },
  { id: "c4", filiere_id: "f4", serie_bac: "A1, B", matiere: "SVT", coefficient: null }, // pas D
  { id: "c5", filiere_id: "f5", serie_bac: "C, D", matiere: "Culture generale", coefficient: null }, // concours
  // f3 : aucune ligne -> ouverte à toutes séries
];
const donnees = bundle(filieres, criteres);

const ids = (r) => r.resultats.map((x) => x.filiere.id);

// --- Éligibilité + type + tri -----------------------------------------------
console.log("Éligibilité (série D) + tri par quota_boursiers");
{
  const r = filtrer(donnees, { serie: "D", notes: {}, aspiration: "" });
  // f4 exclu (A1,B) ; ordre par quota desc : f2(50), f5(40), f1(30), f3(null en dernier).
  eq(ids(r), ["f2", "f5", "f1", "f3"], "D -> {f2,f5,f1,f3} triées, f4 exclue (anti DT/DEAT/A1B)");
  const f3 = r.resultats.find((x) => x.filiere.id === "f3");
  eq(f3.eligibiliteType, "toutesSeries", "f3 (sans critère) = ouverte à toutes séries");
  const f1 = r.resultats.find((x) => x.filiere.id === "f1");
  eq(f1.eligibiliteType, "critere", "f1 = éligible par critère");
}

// --- Concours : pas de moyenne, épreuves listées ----------------------------
console.log("Concours (mode_entree) — pas de moyenne");
{
  const r = filtrer(donnees, { serie: "D", notes: { "Culture generale": 15 }, aspiration: "" });
  const f5 = r.resultats.find((x) => x.filiere.id === "f5");
  eq(f5.moyenne.statut, "concours", "f5 (Concours) -> statut concours malgré une note saisie");
  eq(f5.moyenne.epreuves, ["Culture generale"], "f5 expose ses épreuves");
}

// --- matieresPourSerie : exclut les filières concours -----------------------
console.log("matieresPourSerie(D)");
eq(
  matieresPourSerie(donnees, "D"),
  ["Maths", "PCT", "Philosophie"],
  "matières des filières CLASSEMENT uniquement (pas 'Culture generale' du concours f5, ni SVT réservé A1/B)"
);

// --- Estimation : complète / incomplète / sans matière / non saisie ---------
console.log("Estimation de moyenne (non pondérée)");
{
  const r = filtrer(donnees, {
    serie: "D",
    notes: { Maths: 14, PCT: 10 }, // f1 complet, f2 incomplet (manque Philosophie)
    aspiration: "",
  });
  const f1 = r.resultats.find((x) => x.filiere.id === "f1");
  const f2 = r.resultats.find((x) => x.filiere.id === "f2");
  const f3 = r.resultats.find((x) => x.filiere.id === "f3");
  eq({ s: f1.moyenne.statut, v: f1.moyenne.valeur }, { s: "estimee", v: 12 }, "f1 moyenne (14+10)/2 = 12");
  eq({ s: f2.moyenne.statut, m: f2.moyenne.manquantes }, { s: "incomplete", m: ["Philosophie"] }, "f2 données insuffisantes");
  eq(f3.moyenne.statut, "sansMatiere", "f3 pas de matière de sélection");
}
{
  const r = filtrer(donnees, { serie: "D", notes: {}, aspiration: "" });
  eq(r.resultats.find((x) => x.filiere.id === "f1").moyenne.statut, "nonSaisi", "sans notes -> mode éligibilité");
}

// --- Aspiration : CLASSEMENT par pertinence, jamais éliminatoire ------------
console.log("Aspiration (classement par pertinence, non éliminatoire)");
{
  const r = filtrer(donnees, { serie: "D", notes: {}, aspiration: "developpeur informatique" });
  eq(r.resultats.length, 4, "aspiration ne supprime aucune filière éligible");
  eq(r.resultats[0].filiere.id, "f1", "‘informatique’ -> f1 (Informatique) remonte en tête");
  eq(r.infoAspiration.actif, true, "aspiration active");
  eq(r.infoAspiration.nbPertinentes >= 1, true, "au moins 1 filière pertinente");
}
{
  const r = filtrer(donnees, { serie: "D", notes: {}, aspiration: "xyzaucunmatch" });
  eq(ids(r), ["f2", "f5", "f1", "f3"], "aucun match -> tri par quota inchangé, rien supprimé");
  eq(r.infoAspiration.nbPertinentes, 0, "0 filière pertinente");
}
{
  const r = filtrer(donnees, { serie: "D", notes: {}, aspiration: "je veux faire" });
  eq(r.infoAspiration, null, "que des stop-words -> aspiration inactive");
}

console.log(`\n${passed} réussis, ${failed} échoués`);
if (failed > 0) process.exit(1);
