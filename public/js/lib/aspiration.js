// =============================================================================
// aspiration.js — Pertinence de l'aspiration (étape 3), JS pur, SANS IA
// -----------------------------------------------------------------------------
// RÔLE (v1) : l'aspiration ne FILTRE pas (elle ne cache jamais une filière
//   éligible) — elle produit un SCORE de pertinence qui sert au CLASSEMENT.
//
//   Pipeline :
//     1. mots-clés de l'utilisateur (≥ 3 lettres, sans stop-words, sans accents)
//     2. expansion via un LEXIQUE de synonymes métier (codé en dur, auditable)
//     3. score par filière : terme trouvé dans `intitule` (poids 2) ou
//        `debouches` (poids 1), avec correspondance par RACINE (pluriels/dérivés)
//
//   ⚠️ Heuristique TRANSITOIRE assumée : ce n'est PAS le moteur sémantique
//   (embeddings `filieres_embeddings`) prévu à terme. Pas de compréhension du
//   sens : « aider les gens » ne marche que via le lexique ci-dessous.
//
// Module PUR (aucune dépendance navigateur) -> testable sous Node.
// =============================================================================

/** Mots vides français à ignorer (le filtre ≥ 3 lettres en retire déjà beaucoup). */
const STOPWORDS = new Set([
  "les", "des", "une", "que", "qui", "quoi", "dont", "pour", "par", "dans", "sur",
  "sous", "avec", "sans", "vers", "chez", "entre", "est", "sont", "etre", "avoir",
  "fait", "faire", "fais", "veux", "veut", "voudrais", "aimerais", "souhaite",
  "plus", "tres", "bien", "aussi", "comme", "mon", "mes", "ton", "tes", "son",
  "ses", "notre", "votre", "leur", "cette", "cet", "ces", "vie", "gens", "monde",
  "travail", "travailler", "metier", "domaine", "futur", "avenir", "carriere",
]);

// Lexique de synonymes : si un mot de l'utilisateur touche un cluster, on ajoute
// TOUS les termes du cluster aux termes recherchés dans intitule/debouches.
// Termes en minuscules, sans accents. Calé sur les filières réelles de l'UAC.
const CLUSTERS = [
  // Santé
  ["sante", "medecine", "medical", "medecin", "soin", "soigner", "malade", "maladie",
   "hopital", "hospitalier", "infirmier", "infirmiere", "pharmacie", "pharmacien",
   "clinique", "epidemiologie", "kinesitherapie", "obstetrique", "biomedical", "dentaire"],
  // Enseignement / éducation
  ["enseignement", "enseigner", "professeur", "education", "educatif", "pedagogie",
   "instituteur", "ecole", "apprendre", "former", "formateur", "didactique"],
  // Informatique / numérique
  ["informatique", "informaticien", "ordinateur", "logiciel", "developpeur",
   "developpement", "programmation", "programmeur", "reseau", "reseaux", "numerique",
   "digital", "data", "donnee", "donnees", "systeme", "web", "multimedia", "internet"],
  // Gestion / économie / commerce
  ["gestion", "gestionnaire", "entreprise", "management", "comptabilite", "comptable",
   "finance", "financier", "banque", "bancaire", "economie", "economique", "commerce",
   "commercial", "marketing", "vente", "assurance", "audit", "fiscalite"],
  // Droit
  ["droit", "juridique", "juriste", "avocat", "magistrat", "juge", "justice",
   "notaire", "legislation", "tribunal"],
  // Agriculture / environnement
  ["agriculture", "agricole", "agronomie", "agronome", "elevage", "vegetal", "animal",
   "peche", "aquaculture", "foret", "forestier", "rural", "environnement", "ecologie",
   "eau", "assainissement", "nutrition", "aliment", "alimentaire"],
  // Ingénierie / technique
  ["ingenieur", "ingenierie", "genie", "technique", "technologie", "industriel",
   "mecanique", "electrique", "electronique", "electrotechnique", "civil", "batiment",
   "construction", "energie", "maintenance", "topographie", "geometre"],
  // Langues / lettres / communication / médias
  ["langue", "langues", "traducteur", "traduction", "interprete", "linguistique",
   "anglais", "espagnol", "allemand", "chinois", "arabe", "lettres", "litterature",
   "communication", "journalisme", "journaliste", "media", "audiovisuel"],
  // Social / psychologie
  ["social", "sociologie", "psychologie", "psychologue", "humanitaire", "aide",
   "assistance", "developpement"],
  // Arts / culture / tourisme
  ["art", "arts", "artistique", "design", "mode", "stylisme", "musique", "culture",
   "culturel", "tourisme", "hotellerie", "restauration", "patrimoine"],
  // Sport
  ["sport", "sportif", "sportive", "athletisme", "physique", "entrainement", "eps"],
  // Statistique / mathématiques
  ["statistique", "statisticien", "demographie", "demographique", "mathematiques", "maths"],
];

/** Minuscules + suppression des accents. */
function normaliser(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Tokenise un texte en mots (≥ 3 lettres). */
function mots(s) {
  return normaliser(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

/** Plus longue préfixe commun de deux chaînes (longueur). */
function prefixeCommun(a, b) {
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/**
 * Deux mots partagent-ils la même racine ? Vrai si l'un est préfixe de l'autre
 * (pluriels/diminutifs : art/arts, droit/droits, gestion/gestionnaire) OU s'ils
 * partagent un préfixe long (dérivations : informaticien/informatique).
 */
export function racineMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const p = prefixeCommun(a, b);
  if (p === Math.min(a.length, b.length)) return true; // l'un préfixe de l'autre
  return p >= 6; // racine commune longue
}

/**
 * Analyse l'aspiration : mots-clés nettoyés + termes de recherche étendus (lexique).
 * @param {string} texte
 * @returns {{ mots: string[], termes: string[] }}
 */
export function analyserAspiration(texte) {
  const motsUtilisateur = mots(texte).filter((w) => !STOPWORDS.has(w));
  if (motsUtilisateur.length === 0) return { mots: [], termes: [] };

  const termes = new Set(motsUtilisateur);
  for (const mot of motsUtilisateur) {
    for (const cluster of CLUSTERS) {
      if (cluster.some((t) => racineMatch(mot, t))) {
        for (const t of cluster) termes.add(t);
      }
    }
  }
  return { mots: motsUtilisateur, termes: Array.from(termes) };
}

/** Un terme est-il présent dans une liste de mots (par racine) ? */
function presentDans(motsTexte, terme) {
  return motsTexte.some((w) => racineMatch(w, terme));
}

/**
 * Score de pertinence d'une filière vis-à-vis des termes recherchés.
 * Match dans `intitule` = 2 points ; dans `debouches` = 1 point.
 * @returns {number} 0 si aucune correspondance.
 */
export function scoreAspiration(filiere, termes) {
  if (!termes || termes.length === 0) return 0;
  const motsIntitule = mots(filiere.intitule);
  const motsDebouches = mots(filiere.debouches);
  let score = 0;
  for (const t of termes) {
    if (presentDans(motsIntitule, t)) score += 2;
    else if (presentDans(motsDebouches, t)) score += 1;
  }
  return score;
}

export { STOPWORDS, CLUSTERS };
