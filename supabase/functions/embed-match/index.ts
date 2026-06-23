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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ── Rate limiting (en mémoire, par IP, par isolate Deno) ─────────────────────
// Protège le quota Gemini : 429 renvoyé AVANT tout appel à l'API externe.
// Limite : 15 requêtes / 60 s par adresse IP.
// Note : la Map est réinitialisée au cold start de l'isolate — protection
// suffisante contre le martelage depuis une IP fixe.
const RATE_LIMIT_RPM = 15;
const RATE_WINDOW_MS = 60_000;

interface RateBucket { count: number; resetAt: number; }
const rateMap = new Map<string, RateBucket>();

function clientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Purge ponctuelle pour éviter la fuite mémoire si la map grossit
  if (rateMap.size > 500) {
    for (const [k, v] of rateMap) if (now >= v.resetAt) rateMap.delete(k);
  }
  const b = rateMap.get(ip);
  if (!b || now >= b.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  return ++b.count > RATE_LIMIT_RPM;
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
  if (isRateLimited(clientIP(req))) return tooMany();
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
