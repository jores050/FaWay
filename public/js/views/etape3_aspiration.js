// =============================================================================
// views/etape3_aspiration.js — Étape 3 : aspiration (texte libre, OPTIONNEL)
// -----------------------------------------------------------------------------
// ⚠️ Dans cette v1, l'aspiration ne déclenche qu'un FILTRAGE PAR MOTS-CLÉS sur
//    `intitule` + `debouches` (voir engine/filtrage.js). Ce n'est PAS encore le
//    moteur sémantique (embeddings) prévu à terme — c'est volontaire et assumé.
// =============================================================================

import { lireEtat, definirAspiration } from "../store.js";
import { el, monter, stepper } from "../ui.js";
import { naviguer } from "../router.js";

export function render(mount) {
  const etat = lireEtat();
  if (!etat.serie) {
    naviguer("#/etape1");
    return;
  }

  const textarea = el("textarea", {
    id: "aspiration",
    placeholder: "Ex. : je veux devenir ingénieur en informatique, ou travailler dans la santé…",
  });
  textarea.value = etat.aspiration || "";
  textarea.addEventListener("input", () => definirAspiration(textarea.value));

  monter(
    mount,
    stepper(3),
    el(
      "section",
      { class: "card stack" },
      el("h1", {}, "Que veux-tu faire dans la vie ?"),
      el(
        "p",
        { class: "muted" },
        "Optionnel. On s'en sert pour mettre en avant les filières dont l'intitulé ou les débouchés contiennent tes mots-clés."
      ),
      el("div", { class: "field" }, el("label", { for: "aspiration" }, "Ton aspiration"), textarea),
      el(
        "p",
        { class: "hint" },
        "Recherche par mots-clés simple pour l'instant (pas encore d'analyse sémantique)."
      ),
      el(
        "div",
        { class: "actions actions--between" },
        el("a", { class: "btn btn--ghost", href: "#/etape2" }, "← Retour"),
        el("a", { class: "btn btn--primary", href: "#/resultats" }, "Voir mes résultats")
      )
    )
  );
}
