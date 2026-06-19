// =============================================================================
// scripts/generate-embeddings.mjs — Génère les embeddings de filières (V2)
// -----------------------------------------------------------------------------
// Construit un texte source par filière (intitulé + description + 6-8 métiers
// principaux), l'embarque via Gemini text-embedding-004 (768 dims) et l'insère
// dans `filieres_embeddings`.
//
//   IDEMPOTENT : ne (re)génère QUE les filières sans embedding -> relançable sans
//   recracher d'appels API coûteux. Throttle + retry exponentiel sur erreur/429.
//
// Variables d'environnement requises (jamais committées) :
//   GEMINI_API_KEY        clé API Gemini
//   SUPABASE_URL          (def. projet connu)
//   SUPABASE_SERVICE_KEY  clé service_role (écriture filieres_embeddings, RLS bypass)
//
// Lancement :  node scripts/generate-embeddings.mjs
// =============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://lrgitzhrrgwcbswjcbbc.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_KEY;
// text-embedding-004 n'est pas exposé par cette clé -> gemini-embedding-001, forcé
// à 768 dims (outputDimensionality) pour rester compatible avec la colonne vector(768).
const MODELE = "gemini-embedding-001";
const DIMS = 768;
const THROTTLE_MS = 150; // espacement entre appels (quota gratuit Gemini généreux, on reste prudent)

if (!GEMINI_API_KEY || !SERVICE) {
  console.error("❌ GEMINI_API_KEY et SUPABASE_SERVICE_KEY doivent être définis dans l'environnement.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const restHeaders = { apikey: SERVICE, Authorization: "Bearer " + SERVICE };

/** Lecture paginée d'une table (REST). */
async function fetchAll(path) {
  const out = [];
  let from = 0;
  for (;;) {
    const res = await fetch(SUPABASE_URL + "/rest/v1" + path, {
      headers: { ...restHeaders, "Range-Unit": "items", Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`lecture ${path} -> ${res.status} ${(await res.text()).slice(0, 150)}`);
    const b = await res.json();
    out.push(...b);
    if (b.length < 1000) break;
    from += b.length;
  }
  return out;
}

/** Retry exponentiel pour les appels réseau (API/insert). */
async function withRetry(fn, label, tries = 4) {
  let delay = 800;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tries) throw e;
      console.warn(`   ↻ retry ${i}/${tries - 1} (${label}) : ${e.message}`);
      await sleep(delay);
      delay *= 2;
    }
  }
}

/** Embedding Gemini (768 dims). */
async function embed(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/" + MODELE,
      content: { parts: [{ text }] },
      outputDimensionality: DIMS,
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} ${(await res.text()).slice(0, 180)}`);
  const j = await res.json();
  const v = j.embedding && j.embedding.values;
  if (!Array.isArray(v) || v.length !== DIMS) throw new Error("vecteur invalide (len=" + (v ? v.length : "?") + ")");
  return v;
}

/** Insertion d'une ligne filieres_embeddings (embedding au format pgvector "[..]"). */
async function insertEmbedding(filiere_id, vec, contenu_source) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/filieres_embeddings", {
    method: "POST",
    headers: { ...restHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      filiere_id,
      embedding: "[" + vec.join(",") + "]",
      contenu_source,
      modele_utilise: MODELE,
    }),
  });
  if (!res.ok) throw new Error(`insert ${res.status} ${(await res.text()).slice(0, 180)}`);
}

/** Texte source à embedder, au format imposé :
 *  "{intitule}. {description?}. Débouchés : {6-8 métiers}." (fallback debouches brut). */
function texteSource(f, metiers) {
  let txt = (f.intitule || "").trim();
  if (f.description && f.description.trim()) txt += ". " + f.description.trim();
  let deb;
  if (metiers.length > 0) deb = metiers.slice(0, 8).map((m) => m.nom).join(", ");
  else deb = (f.debouches || "").replace(/\s+/g, " ").trim().slice(0, 300);
  txt += deb ? ". Débouchés : " + deb + "." : ".";
  return txt;
}

async function main() {
  console.log("Chargement des données…");
  const [filieres, liaisons, metiers, deja] = await Promise.all([
    fetchAll("/filieres?select=id,intitule,description,debouches"),
    fetchAll("/filieres_metiers?select=filiere_id,metier_id"),
    fetchAll("/metiers?select=id,nom"),
    fetchAll("/filieres_embeddings?select=filiere_id"),
  ]);
  const metierById = new Map(metiers.map((m) => [m.id, m]));
  const metiersParFiliere = new Map();
  for (const l of liaisons) {
    const m = metierById.get(l.metier_id);
    if (!m) continue;
    if (!metiersParFiliere.has(l.filiere_id)) metiersParFiliere.set(l.filiere_id, []);
    metiersParFiliere.get(l.filiere_id).push(m);
  }
  const fait = new Set(deja.map((d) => d.filiere_id));
  const aTraiter = filieres.filter((f) => !fait.has(f.id));
  console.log(`Filières : ${filieres.length} · déjà embeddées : ${fait.size} · à traiter : ${aTraiter.length}`);

  let ok = 0,
    ko = 0;
  for (let i = 0; i < aTraiter.length; i++) {
    const f = aTraiter[i];
    const src = texteSource(f, metiersParFiliere.get(f.id) || []);
    try {
      const vec = await withRetry(() => embed(src), "embed");
      await withRetry(() => insertEmbedding(f.id, vec, src), "insert");
      ok++;
      if ((i + 1) % 20 === 0 || i === aTraiter.length - 1)
        console.log(`  ${i + 1}/${aTraiter.length} (${ok} ok, ${ko} ko)`);
    } catch (e) {
      ko++;
      console.error(`  ✗ ${f.intitule} : ${e.message}`);
    }
    await sleep(THROTTLE_MS);
  }
  console.log(`\nTerminé. Insérés : ${ok} · échecs : ${ko}.`);
  if (ko > 0) console.log("Relance le script : il ne reprendra QUE les filières encore sans embedding.");
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
