// =============================================================================
// data/queries.js — Toutes les lectures Supabase (et seulement elles)
// -----------------------------------------------------------------------------
// - Aucune donnée mockée : tout vient de Supabase.
// - Gestion d'erreur CENTRALISÉE : toute requête échouée lève une `ErreurDonnees`
//   avec un message lisible, que les vues affichent telle quelle (jamais de page
//   blanche).
// - Le jeu de données UAC est petit (~119 filières) : on charge tout une fois et
//   on met en cache, puis le filtrage se fait en JS côté client.
// =============================================================================

import { supabase, configValide } from "../lib/supabaseClient.js";

/** Erreur normalisée de la couche données (affichable à l'utilisateur). */
export class ErreurDonnees extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ErreurDonnees";
    this.cause = cause;
  }
}

/** Lecture générique d'une table avec gestion d'erreur uniforme. */
async function lire(table, colonnes) {
  if (!configValide || !supabase) {
    throw new ErreurDonnees(
      "Configuration Supabase manquante. Copie public/js/config.example.js en config.js et renseigne tes clés."
    );
  }
  const { data, error } = await supabase.from(table).select(colonnes);
  if (error) {
    throw new ErreurDonnees(
      `Impossible de charger les données (${table}). Vérifie ta connexion et tes accès Supabase.`,
      error
    );
  }
  return data || [];
}

/** Indexe un tableau d'objets par leur `id` -> Map(id => objet). */
function indexerParId(rows) {
  const m = new Map();
  for (const r of rows) m.set(r.id, r);
  return m;
}

/** Regroupe les lignes par une clé -> Map(clé => tableau de lignes). */
function grouperPar(rows, cle) {
  const m = new Map();
  for (const r of rows) {
    const k = r[cle];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

let _cache = null;

// Pondérations par défaut (miroir exact de config_scoring en base).
// Ne jamais les modifier ici — la source de vérité est la table Supabase.
const POIDS_DEFAUT = {
  affinite_reve: 0.40,
  marge_academique: 0.25,
  resistance_ia: 0.20,
  accessibilite_geo: 0.10,
  accessibilite_financiere: 0.05,
};

/**
 * Charge (et met en cache) l'ensemble des données nécessaires au moteur :
 * filières, critères de classement, établissements, universités.
 * @returns {Promise<{
 *   filieres: any[], criteres: any[], etablissements: any[], universites: any[],
 *   etabParId: Map<string, any>, univParId: Map<string, any>,
 *   criteresParFiliere: Map<string, any[]>,
 *   poids: object
 * }>}
 */
export async function chargerDonnees() {
  if (_cache) return _cache;

  // Colonnes alignées sur le schéma RÉEL (ne pas supposer d'autres colonnes).
  const [filieres, criteres, etablissements, universites] = await Promise.all([
    lire(
      "filieres",
      "id, etablissement_id, domaine_id, intitule, sigle, niveau, duree_annees, diplome_delivre, description, debouches, source_page, quota_boursiers, quota_payant, quota_entierement_payant, mode_entree"
    ),
    lire("criteres_classement", "id, filiere_id, serie_bac, matiere, coefficient"),
    lire(
      "etablissements",
      "id, universite_id, nom, sigle, type, ville, source_page"
    ),
    lire("universites", "id, nom, sigle, ville"),
  ]);

  // Pondérations depuis config_scoring. NON BLOQUANT : si la table est vide
  // ou inaccessible, on utilise POIDS_DEFAUT (définis plus haut).
  const poids = { ...POIDS_DEFAUT };
  try {
    const lignes = await lire("config_scoring", "cle, valeur");
    for (const row of lignes) {
      const cle = String(row.cle).replace("poids_", "");
      const v = parseFloat(row.valeur);
      if (!isNaN(v) && Object.prototype.hasOwnProperty.call(poids, cle)) poids[cle] = v;
    }
  } catch {}

  // Métiers structurés + risque IA (V2). NON BLOQUANT : si ces tables sont
  // indisponibles (RLS, etc.), on dégrade proprement vers `debouches` texte plutôt
  // que de casser tout l'écran. Certains métiers ("Autre") n'ont PAS de risque.
  let metiers = [],
    risques = [],
    liaisons = [];
  try {
    [metiers, risques, liaisons] = await Promise.all([
      lire("metiers", "id, nom, secteur"),
      lire("metiers_risque_ia", "metier_id, score_risque, horizon_annees, justification, source_reference"),
      lire("filieres_metiers", "filiere_id, metier_id"),
    ]);
  } catch (e) {
    metiers = [];
    risques = [];
    liaisons = [];
  }

  const metierParId = indexerParId(metiers);
  const risqueParMetier = new Map(risques.map((r) => [r.metier_id, r]));
  const metiersParFiliere = new Map();
  for (const l of liaisons) {
    const m = metierParId.get(l.metier_id);
    if (!m) continue;
    const r = risqueParMetier.get(l.metier_id) || null;
    if (!metiersParFiliere.has(l.filiere_id)) metiersParFiliere.set(l.filiere_id, []);
    metiersParFiliere.get(l.filiere_id).push({
      id: m.id,
      nom: m.nom,
      secteur: m.secteur,
      score: r ? r.score_risque : null, // null = "Autre" / non évalué (à gérer à l'affichage)
      horizon: r ? r.horizon_annees : null,
      justification: r ? r.justification : null,
      source: r ? r.source_reference : null,
    });
  }
  // Tri par risque croissant, NULL (non évalué) en dernier — les métiers les plus sûrs d'abord.
  for (const arr of metiersParFiliere.values()) {
    arr.sort((a, b) => (a.score == null ? Infinity : a.score) - (b.score == null ? Infinity : b.score));
  }

  _cache = {
    filieres,
    criteres,
    etablissements,
    universites,
    filiereParId: indexerParId(filieres),
    etabParId: indexerParId(etablissements),
    univParId: indexerParId(universites),
    criteresParFiliere: grouperPar(criteres, "filiere_id"),
    metiersParFiliere,
    poids,
  };
  return _cache;
}

/** Vide le cache (utile pour forcer un rechargement). */
export function viderCache() {
  _cache = null;
}

/**
 * Récupère une filière enrichie (établissement + université + critères) par id,
 * à partir des données déjà chargées.
 * @param {string} filiereId
 */
export async function chargerFiliere(filiereId) {
  const d = await chargerDonnees();
  const filiere = d.filieres.find((f) => f.id === filiereId);
  if (!filiere) {
    throw new ErreurDonnees("Filière introuvable.");
  }
  const etablissement = d.etabParId.get(filiere.etablissement_id) || null;
  const universite = etablissement
    ? d.univParId.get(etablissement.universite_id) || null
    : null;
  const criteres = d.criteresParFiliere.get(filiere.id) || [];
  const metiers = (d.metiersParFiliere && d.metiersParFiliere.get(filiere.id)) || [];
  return { filiere, etablissement, universite, criteres, metiers };
}
