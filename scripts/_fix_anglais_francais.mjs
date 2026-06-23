import { createClient } from "@supabase/supabase-js";

// Service role nécessaire pour UPDATE — lire depuis env
const SUPABASE_URL = "https://lrgitzhrrgwcbswjcbbc.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY manquant");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Vérification avant modification
const { data: avant } = await sb
  .from("criteres_classement")
  .select("id, matiere, filiere_id, serie_bac")
  .eq("matiere", "Anglais / Français");

console.log(`Avant : ${avant.length} ligne(s) à corriger`);
avant.forEach((r) => console.log(`  id=${r.id}  serie_bac="${r.serie_bac}"`));

// Correction
const { error, count } = await sb
  .from("criteres_classement")
  .update({ matiere: "Anglais ou Français" })
  .eq("matiere", "Anglais / Français");

if (error) {
  console.error("❌ Erreur UPDATE :", error.message);
  process.exit(1);
}

// Vérification après
const { data: apres } = await sb
  .from("criteres_classement")
  .select("id, matiere")
  .eq("matiere", "Anglais ou Français");

console.log(`\nAprès : ${apres.length} ligne(s) avec "Anglais ou Français" ✓`);
console.log('Reste avec "Anglais / Français" :', (await sb
  .from("criteres_classement")
  .select("id", { count: "exact", head: true })
  .eq("matiere", "Anglais / Français")).count ?? 0);
