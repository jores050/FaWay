// =============================================================================
// supabaseClient.js — Initialise le client Supabase à partir de window.APP_CONFIG
// -----------------------------------------------------------------------------
// La librairie est chargée via CDN ESM (aucun build, aucun npm install requis).
// La clé "anon" est publique et destinée au navigateur ; l'accès reste borné par
// les RLS du projet (lecture publique des tables de référence uniquement).
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = (typeof window !== "undefined" && window.APP_CONFIG) || {};

// Détecte une config absente ou laissée sur les valeurs-modèles de config.example.js.
export const configValide = Boolean(
  cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !String(cfg.SUPABASE_URL).includes("VOTRE-PROJET") &&
    !String(cfg.SUPABASE_ANON_KEY).includes("VOTRE_CLE")
);

// On ne crée le client que si la config est valide, pour pouvoir afficher un
// écran d'aide plutôt que de planter au chargement du module.
export const supabase = configValide
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: false }, // app sans compte : pas de session
    })
  : null;
