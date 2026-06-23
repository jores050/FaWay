// =============================================================================
// main.js — Point d'entrée : vérifie la config puis démarre le routeur
// -----------------------------------------------------------------------------
// Les vues sont chargées en import dynamique : chacune exporte render(mount, params).
// =============================================================================

import { configValide } from "./lib/supabaseClient.js";
import { demarrerRouteur } from "./router.js";
import { boiteErreur, el, monter } from "./ui.js";

const app = document.getElementById("app");

if (!configValide) {
  // Pas de clés Supabase : on guide l'utilisateur au lieu de planter.
  monter(app, ecranConfigManquante());
} else {
  demarrerRouteur({
    mount: app,
    fallback: "accueil",
    routes: {
      accueil: (m, p) => charger("./views/landing.js", m, p),
      etape1: (m, p) => charger("./views/etape1_serie.js", m, p),
      etape2: (m, p) => charger("./views/etape2_notes.js", m, p),
      etape3: (m, p) => charger("./views/etape3_aspiration.js", m, p),
      resultats: (m, p) => charger("./views/resultats.js", m, p),
      filiere: (m, p) => charger("./views/filiere.js", m, p),
      methodologie: (m, p) => charger("./views/methodologie.js", m, p),
    },
    onErreur: (m, e) =>
      monter(m, boiteErreur(e && e.message, e && e.cause && e.cause.message)),
  });
}

/** Charge dynamiquement une vue et appelle son render(). */
async function charger(chemin, mount, params) {
  const mod = await import(chemin);
  await mod.render(mount, params);
}

/** Écran affiché tant que public/js/config.js n'est pas renseigné. */
function ecranConfigManquante() {
  return el(
    "section",
    { class: "card stack" },
    el("h1", {}, "Configuration requise"),
    el(
      "p",
      {},
      "L'application a besoin des accès Supabase (lecture publique) pour charger les filières."
    ),
    el(
      "ol",
      { class: "list" },
      el(
        "li",
        {},
        "Copie ",
        el("code", {}, "public/js/config.example.js"),
        " en ",
        el("code", {}, "public/js/config.js"),
        "."
      ),
      el(
        "li",
        {},
        "Renseigne ",
        el("code", {}, "SUPABASE_URL"),
        " et ",
        el("code", {}, "SUPABASE_ANON_KEY"),
        " (clé anon, publique)."
      ),
      el("li", {}, "Recharge la page.")
    )
  );
}
