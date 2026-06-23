// =============================================================================
// lib/coefficients.js — Coefficients du baccalauréat béninois par série
// -----------------------------------------------------------------------------
// Source : Arrêté interministériel N°016-2003/MESRS/MEPS/METFP/CAB/DC/SGM/DOB-BTS/SP
// Validé par les exemples officiels du guide d'orientation du Ministère (page 8).
//
// Formule de classement officielle :
//   M = Σ(note × coef) / Σ(coef)
//
// Premier groupe uniquement (épreuves principales). EPS et 2e groupe exclus.
// Module PUR (aucune dépendance navigateur) → testable sous Node.
// =============================================================================

/** Coefficients par série (libellés normalisés selon l'arrêté). */
const SERIES = {
  "A1": { "Français": 5, "Philosophie": 4, "Histoire-Géographie": 3, "Langue vivante 1": 3, "Langue vivante 2": 2, "Mathématiques": 2, "SVT": 2 },
  "A2": { "Français": 4, "Philosophie": 3, "Histoire-Géographie": 5, "Langue vivante 1": 3, "Langue vivante 2": 2, "Mathématiques": 2, "SVT": 2 },
  "B":  { "Français": 4, "Philosophie": 3, "Histoire-Géographie": 4, "Langue vivante 1": 2, "Economie": 4, "Mathématiques": 2, "SVT": 2 },
  "C":  { "Mathématiques": 6, "Sciences Physiques": 5, "Français": 2, "Anglais": 2, "SVT": 2, "Histoire-Géographie": 2, "Philosophie": 2 },
  "D":  { "Mathématiques": 4, "Sciences Physiques": 4, "Français": 2, "Anglais": 2, "SVT": 5, "Histoire-Géographie": 2, "Philosophie": 2 },
  "E":  { "Français": 2, "Mathématiques": 5, "Sciences Physiques": 4, "Construction Mécanique": 3, "Manipulation (Travaux Pratiques)": 3, "Etude de Fabrication ou Technologie": 2 },
  "F1": { "Français": 2, "Mathématiques": 3, "Sciences Physiques": 2, "Construction Mécanique": 3, "Mécanique": 2, "Automatique": 2, "Etude d'Outillage": 2, "Analyse de Fabrication": 3, "Travaux Pratiques": 3 },
  "F2": { "Français": 2, "Mathématiques": 3, "Sciences Physiques": 2, "Construction Mécanique": 2, "Etude d'un Système Technique": 4, "Informatique (T.P.)": 2, "Réalisation de Maquette (T.P.)": 4, "Mesures et Essais de Laboratoire (T.P.)": 3 },
  "F3": { "Français": 2, "Mathématiques": 3, "Sciences Physiques": 2, "Electrotechnique": 3, "Etude de Système Technique": 5, "Construction (T.P.)": 4, "Mesure et Essai de Laboratoire (T.P.)": 3 },
  "F4": { "Français": 2, "Mathématiques": 3, "Sciences Physiques": 2, "Résistance des Matériaux": 3, "Béton Armé": 2, "Métré et Etude de Prix": 2, "Procédé de Construction": 2, "Projet d'Exploitation (T.P.)": 3, "Dessin Technique (T.P.)": 3 },
  "G1": { "Français": 3, "Etude de Cas": 4, "Economie": 3, "Anglais": 2, "Compte-Rendu PV + Rapport": 3, "Droit Administratif et Droit du Travail": 2, "Techniques de base de secrétariat": 3 },
  "G2": { "Français": 3, "Etude de Cas": 6, "Economie": 3, "Anglais": 2, "Mathématiques Appliquées": 3, "Droit (TBAD-Finances Publiques)": 2 },
  "G3": { "Français": 3, "Etude de Cas": 6, "Economie": 3, "Anglais": 2, "Mathématiques Appliquées": 3, "Droit (TBAD-Finances Publiques)": 2 },
  "EA": { "Français": 2, "Assainissement": 2, "Mathématiques": 3, "Anglais": 1, "Sciences Physiques": 2, "Mobilisation des ressources en eau": 4, "Projet d'exploitation": 4, "Traitement de l'eau (T.P.)": 4, "Réseaux hydrauliques (T.P.)": 3 },
};

/** Séries valides du bac béninois — liste fermée. Toute autre valeur est un bug en amont. */
export const SERIES_VALIDES = new Set([
  "A1", "A2", "B", "C", "D", "E",
  "F1", "F2", "F3", "F4",
  "G1", "G2", "G3",
  "EA",
]);

/** Mapping libellés guide d'orientation → libellés arrêté bac. */
const MAPPING = {
  // Séries générales
  "Maths":              "Mathématiques",
  "Mathématiques":      "Mathématiques",
  "PCT":                "Sciences Physiques",
  "SPCT":               "Sciences Physiques",
  "Sciences Physiques": "Sciences Physiques",
  "Physique-Chimie":    "Sciences Physiques",
  "SVT":                "SVT",
  "Français":           "Français",
  "Anglais":            "Anglais",
  "Anglais (LV1)":      "Anglais",
  "Langue vivante 1":   "Langue vivante 1",
  "Langue vivante 2":   "Langue vivante 2",
  "Hist-Géo":           "Histoire-Géographie",
  "Histoire-Géographie":"Histoire-Géographie",
  "Philo":              "Philosophie",
  "Philosophie":        "Philosophie",
  "Economie":           "Economie",
  "Etude de Cas":       "Etude de Cas",
  "Etude de cas":       "Etude de Cas",
  "Mathématiques Appliquées": "Mathématiques Appliquées",
  // Séries techniques (libellé guide = libellé arrêté)
  "Electrotechnique":                    "Electrotechnique",
  "Etude de Système Technique":          "Etude de Système Technique",
  "EST":                                 "Etude de Système Technique", // alias guide abrégé
  "Etude d'un Système Technique":        "Etude d'un Système Technique",
  "Construction Mécanique":              "Construction Mécanique",
  "Construction (T.P.)":                 "Construction (T.P.)",
  "Mesure et Essai de Laboratoire (T.P.)":"Mesure et Essai de Laboratoire (T.P.)",
  "Mesures et Essais de Laboratoire (T.P.)":"Mesures et Essais de Laboratoire (T.P.)",
  "Travaux Pratiques":                   "Travaux Pratiques",
  "Manipulation (Travaux Pratiques)":    "Manipulation (Travaux Pratiques)",
  "Informatique (T.P.)":                 "Informatique (T.P.)",
  "Réalisation de Maquette (T.P.)":      "Réalisation de Maquette (T.P.)",
  "Analyse de Fabrication":              "Analyse de Fabrication",
  "Etude d'Outillage":                   "Etude d'Outillage",
  "Mécanique":                           "Mécanique",
  "Automatique":                         "Automatique",
  "Etude de Fabrication ou Technologie": "Etude de Fabrication ou Technologie",
  "Résistance des Matériaux":            "Résistance des Matériaux",
  "Béton Armé":                          "Béton Armé",
  "Métré et Etude de Prix":              "Métré et Etude de Prix",
  "Procédé de Construction":             "Procédé de Construction",
  "Projet d'Exploitation (T.P.)":        "Projet d'Exploitation (T.P.)",
  "Dessin Technique (T.P.)":             "Dessin Technique (T.P.)",
  "Compte-Rendu PV + Rapport":           "Compte-Rendu PV + Rapport",
  "Droit Administratif et Droit du Travail":"Droit Administratif et Droit du Travail",
  "Techniques de base de secrétariat":   "Techniques de base de secrétariat",
  "Droit (TBAD-Finances Publiques)":     "Droit (TBAD-Finances Publiques)",
  "Assainissement":                      "Assainissement",
  "Mobilisation des ressources en eau":  "Mobilisation des ressources en eau",
  "Projet d'exploitation":               "Projet d'exploitation",
  "Traitement de l'eau (T.P.)":          "Traitement de l'eau (T.P.)",
  "Réseaux hydrauliques (T.P.)":         "Réseaux hydrauliques (T.P.)",
};

/**
 * Cherche le coefficient d'une matière (libellé guide) dans la série donnée.
 * @param {string} matiereGuide  Libellé résolu issu de criteres_classement/matiereResolver
 * @param {string} serie         Série du bac (ex. "D", "C", "F3") — JAMAIS un nom de matière
 * @returns {{ coef: number, canonique: string } | null}
 *   null = matière ou série inconnue → neutraliser le calcul, logger le cas
 */
export function trouverCoefficient(matiereGuide, serie) {
  const serieStr = String(serie).trim();

  // Garde-fou : détecter si un nom de matière a été passé à la place de la série.
  if (!SERIES_VALIDES.has(serieStr)) {
    console.error(
      `[coefficients] BUG : "${serieStr}" n'est pas une série valide du bac béninois. ` +
      `Séries attendues : ${[...SERIES_VALIDES].join(", ")}. ` +
      `Un nom de matière a peut-être été passé à la place de la série.`
    );
    return null;
  }

  const matiereStr = String(matiereGuide).trim();
  // Mapping guide → arrêté ; si absent, essai direct (libellé guide = libellé arrêté pour les séries tech).
  const canonique = MAPPING[matiereStr] ?? matiereStr;

  const coefsSerie = SERIES[serieStr] ?? null;
  if (!coefsSerie) return null;
  const coef = coefsSerie[canonique] ?? null;
  if (coef == null) return null;
  return { coef, canonique };
}
