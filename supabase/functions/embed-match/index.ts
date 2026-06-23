// =============================================================================
// Edge Function `embed-match` (Deno) — matching sémantique de l'aspiration
// -----------------------------------------------------------------------------
// La clé Gemini reste un SECRET serveur (jamais exposée au frontend).
//
//   POST { aspiration: string, eligibleIds: string[] }
//     -> { ranking: [{ filiere_id, similarite }] }
//
//   - aspiration vide OU aucune filière éligible -> { ranking: [] } (aucun appel API)
//   - embed l'aspiration (text-embedding-004) puis appelle la RPC `match_filieres`
//     RESTREINTE aux eligibleIds (Couche 1 d'abord, pertinence ensuite)
//   - toute erreur -> { ranking: [] } : le frontend retombe silencieusement sur
//     son tri existant, jamais d'écran d'erreur.
//
// Secrets (supabase secrets set ...) : GEMINI_API_KEY
//   SUPABASE_URL et SUPABASE_ANON_KEY sont injectés automatiquement.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Redis } from "https://esm.sh/@upstash/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ── Rate limiting via Upstash Redis — partagé entre tous les isolates ─────────
// Protège le quota Gemini : 429 renvoyé AVANT tout appel à l'API externe.
// Limite : 15 requêtes / 60 s par adresse IP (fenêtre fixe).
// Fail open : si Redis est indisponible, la requête passe (pas de blocage total).
// Secrets requis : UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN
const RATE_LIMIT_RPM = 15;
const RATE_WINDOW_S  = 60;
const RL_PREFIX      = "rl:em:"; // préfixe unique par fonction

// Redis.fromEnv() lit automatiquement UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
const redis = (() => {
  try { return Redis.fromEnv(); } catch { return null; }
})();

function clientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
}

async function isRateLimited(ip: string): Promise<boolean> {
  if (!redis) return false; // fail open si secrets non configurés
  try {
    const key   = RL_PREFIX + ip;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RATE_WINDOW_S); // première req → pose le TTL
    return count > RATE_LIMIT_RPM;
  } catch {
    return false; // fail open si Redis indisponible
  }
}

const tooMany = () =>
  new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: { ...CORS, "Content-Type": "application/json", "Retry-After": "60" },
  });

// Doit être IDENTIQUE au modèle/dim utilisés à la génération (sinon vecteurs incomparables).
const MODELE = "gemini-embedding-001";
const DIMS = 768;

async function embed(text: string): Promise<number[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/" + MODELE,
        content: { parts: [{ text }] },
        outputDimensionality: DIMS,
      }),
    },
  );
  if (!r.ok) throw new Error(`gemini ${r.status} ${(await r.text()).slice(0, 150)}`);
  const j = await r.json();
  const v = j?.embedding?.values;
  if (!Array.isArray(v) || v.length !== DIMS) throw new Error("vecteur invalide");
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (await isRateLimited(clientIP(req))) return tooMany();
  try {
    const { aspiration, eligibleIds } = await req.json();
    const txt = String(aspiration || "").trim();
    if (!txt || !Array.isArray(eligibleIds) || eligibleIds.length === 0) {
      return json({ ranking: [] }); // optionnel : pas d'aspiration -> pas d'appel API
    }

    const vec = await embed(txt);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    // pgvector attend "[v1,v2,…]" en entrée texte.
    const { data, error } = await supabase.rpc("match_filieres", {
      query_embedding: "[" + vec.join(",") + "]",
      eligible: eligibleIds,
      k: 10,
    });
    if (error) throw error;

    return json({ ranking: data ?? [] });
  } catch (e) {
    // Fallback silencieux : le frontend conserve son tri existant.
    // Le message d'erreur n'est jamais renvoyé au client (quota, état clé API).
    console.error("[embed-match]", String((e as Error)?.message ?? e));
    return json({ ranking: [] });
  }
});
