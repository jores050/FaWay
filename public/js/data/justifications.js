// =============================================================================
// data/justifications.js — Couche 3 : justifications IA pour le top des filières
// -----------------------------------------------------------------------------
// Appelle l'Edge Function `smart-worker` (slug Supabase de generate-justification).
// La clé Gemini reste un SECRET serveur — jamais exposée au frontend.
//
// UN SEUL appel par chargement, regroupant les 3-5 meilleures filières.
// Fallback silencieux : retourne Map vide en cas d'erreur, timeout ou quota dépassé.
// NE BLOQUE JAMAIS l'affichage des résultats.
// =============================================================================

import { supabase, configValide } from "../lib/supabaseClient.js";

const EDGE_FN = "smart-worker"; // slug URL de la fonction generate-justification
const MAX_FILIERES = 5;
const TIMEOUT_MS = 10000;

/**
 * Appelle l'Edge Function pour extraire les termes souhaités ("veut") et rejetés ("rejette")
 * depuis une aspiration brute. Fallback silencieux : { veut: [], rejette: [] }.
 *
 * @param {string} aspiration  Texte brut saisi par l'utilisateur
 * @returns {Promise<{ veut: string[], rejette: string[] }>}
 */
export async function extraireAspiration(aspiration) {
  if (!configValide || !supabase) return { veut: [], rejette: [] };
  const txt = (aspiration || "").trim();
  if (!txt) return { veut: [], rejette: [] };

  try {
    const appel = supabase.functions.invoke(EDGE_FN, {
      body: { action: "extract", aspiration: txt },
    });
    const delai = new Promise((res) =>
      setTimeout(() => res({ data: null, error: "timeout" }), 5000)
    );
    const { data, error } = await Promise.race([appel, delai]);
    if (error || !data) return { veut: [], rejette: [] };
    return {
      veut: Array.isArray(data.veut) ? data.veut.filter((v) => typeof v === "string") : [],
      rejette: Array.isArray(data.rejette) ? data.rejette.filter((v) => typeof v === "string") : [],
    };
  } catch (e) {
    console.warn("[aspiration] extraction échouée:", e?.message ?? e);
    return { veut: [], rejette: [] };
  }
}

/** Convertit un score risque IA numérique en libellé lisible. */
function niveauRisque(score) {
  if (score == null) return "non évalué";
  if (score <= 30) return "faible";
  if (score >= 60) return "élevé";
  return "moyen";
}

/**
 * Génère les justifications IA pour le top des filières scorées.
 *
 * @param {object[]} topResultats  Tableau trié par score décroissant (max 5 utilisés)
 * @param {{ serie: string, aspiration: string }} etat
 * @param {{ metiersParFiliere: Map }} donnees  Bundle de chargerDonnees()
 * @returns {Promise<Map<string, string>>}  Map filiere_id -> texte justification
 */
export async function genererJustifications(topResultats, etat, donnees, rejette = []) {
  if (!configValide || !supabase) return new Map();
  if (!Array.isArray(topResultats) || topResultats.length === 0) return new Map();

  try {
    const filieres = topResultats.slice(0, MAX_FILIERES).map((r) => {
      const metiersFiliere =
        (donnees.metiersParFiliere && donnees.metiersParFiliere.get(r.filiere.id)) || [];

      const d = r.scoreDetail ?? {};
      return {
        id: r.filiere.id,
        intitule: r.filiere.intitule,
        etab: r.etablissement?.nom || "Établissement non précisé",
        ville: r.etablissement?.ville || null,
        score_pct: Math.round((r.scoreComposite ?? 0) * 100),
        detail: {
          affinite_pct: Math.round((d.sAffinite ?? 0.5) * 100),
          marge_pct: Math.round((d.sMarge ?? 0.5) * 100),
          avenir_metier_pct: Math.round((d.sAvenir ?? 0.5) * 100),
          financier_pct: Math.round((d.sFinancier ?? 0.5) * 100),
        },
        matieres: r.moyenne?.statut === "estimee" ? (r.moyenne.utilisees || []) : [],
        moyenne_valeur: r.moyenne?.statut === "estimee" ? r.moyenne.valeur : null,
        metiers: metiersFiliere.slice(0, 4).map((m) => ({
          nom: m.nom,
          niveau: niveauRisque(m.score),
        })),
        quota_b: r.filiere.quota_boursiers ?? null,
        quota_p: r.filiere.quota_payant ?? null,
      };
    });

    const appel = supabase.functions.invoke(EDGE_FN, {
      body: {
        serie: etat.serie || "",
        aspiration: (etat.aspiration || "").trim(),
        rejette: Array.isArray(rejette) ? rejette : [],
        filieres,
      },
    });

    const delai = new Promise((res) =>
      setTimeout(() => res({ data: null, error: "timeout" }), TIMEOUT_MS)
    );

    const { data, error } = await Promise.race([appel, delai]);

    if (error || !data || !Array.isArray(data.justifications)) return new Map();

    return new Map(
      data.justifications
        .filter((j) => j && typeof j.filiere_id === "string" && typeof j.texte === "string" && j.texte.trim())
        .map((j) => [j.filiere_id, j.texte.trim()])
    );
  } catch (e) {
    console.warn("[justifications] erreur silencieuse:", e?.message ?? e);
    return new Map();
  }
}
