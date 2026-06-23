// =============================================================================
// config.example.js — MODÈLE de configuration (committé)
// -----------------------------------------------------------------------------
// 1. Copie ce fichier en `config.js` dans le même dossier (public/js/).
// 2. Renseigne l'URL du projet Supabase et la clé ANON (publique, lecture seule).
// 3. `config.js` est gitignoré : aucune clé n'est jamais committée.
//
// La clé "anon" est conçue pour être exposée côté navigateur : l'accès reste
// restreint par les Row Level Security (RLS) du projet Supabase (lecture publique
// des tables de référence uniquement). N'utilise JAMAIS la clé "service_role" ici.
// =============================================================================

window.APP_CONFIG = {
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE_CLE_ANON_PUBLIQUE",
  // Clé Gemini (free-tier, sans carte bancaire).
  // Obtenir sur https://aistudio.google.com/apikey
  // Laisser vide ("") pour désactiver les justifications IA.
  GEMINI_API_KEY: "",
};
