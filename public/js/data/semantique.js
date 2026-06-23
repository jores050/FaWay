// =============================================================================
// data/semantique.js — Appel à l'Edge Function de matching sémantique
// -----------------------------------------------------------------------------
// L'embedding de l'aspiration se fait CÔTÉ SERVEUR (Edge Function `embed-match`),
// la clé Gemini n'est jamais exposée au navigateur.
//
//   classerParSemantique(aspiration, eligibleIds) -> [{ filiere_id, similarite }]
//
// Robustesse : aspiration vide / aucune filière -> [] sans appel réseau.
// Timeout, erreur API ou indisponibilité -> [] : l'appelant garde son tri existant
// (fallback silencieux, jamais d'écran d'erreur).
// =============================================================================

import { supabase, configValide } from "../lib/supabaseClient.js";
import { toastRateLimit } from "../ui.js";

const TIMEOUT_MS = 4000;

/** Retourne true si la réponse supabase-js correspond à un 429. */
function estRateLimite(error, data) {
  if (error && error !== "timeout") {
    if (error?.context?.status === 429 || error?.status === 429) return true;
  }
  // Corps renvoyé par notre fonction avant que supabase-js parse le statut
  if (data?.error === "rate_limited") return true;
  return false;
}

export async function classerParSemantique(aspiration, eligibleIds) {
  const txt = (aspiration || "").trim();
  if (!configValide || !supabase || !txt || !eligibleIds || eligibleIds.length === 0) return [];

  try {
    const appel = supabase.functions.invoke("embed-match", {
      body: { aspiration: txt, eligibleIds },
    });
    const timeout = new Promise((res) => setTimeout(() => res({ data: null, error: "timeout" }), TIMEOUT_MS));
    const { data, error } = await Promise.race([appel, timeout]);
    if (estRateLimite(error, data)) { toastRateLimit(); return []; }
    if (error || !data || !Array.isArray(data.ranking)) return [];
    return data.ranking;
  } catch (e) {
    return []; // dégradation silencieuse
  }
}
