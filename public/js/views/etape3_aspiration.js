// =============================================================================
// views/etape3_aspiration.js — Étape 3 : sélection de domaine(s) + aspiration
// -----------------------------------------------------------------------------
// Flux principal : grille de cartes domaines (1–3 max) → signal de tri côté DB.
// L'aspiration texte libre est optionnelle, repliée sous <details>, et n'appelle
// embed-match QUE si l'utilisateur la remplit.
// =============================================================================

import { lireEtat, definirAspiration, definirDomaines } from "../store.js";
import { el, ico, monter, stepper, chargement } from "../ui.js";
import { chargerDomaines } from "../data/queries.js";
import { naviguer } from "../router.js";

const MAX_DOMAINES = 3;

export async function render(mount) {
  const etat = lireEtat();
  if (!etat.serie) {
    naviguer("#/etape1");
    return;
  }

  monter(mount, stepper(3), chargement("Chargement des domaines…"));

  let domaines = [];
  try {
    domaines = await chargerDomaines();
  } catch {
    // Fallback silencieux : domaines vide → grille vide → on affiche juste l'aspiration
  }

  let selectionnes = Array.isArray(etat.domaines) ? [...etat.domaines] : [];

  // Textarea aspiration (réutilisé tel quel)
  const textarea = el("textarea", {
    id: "aspiration",
    placeholder: "Ex. : je veux devenir ingénieur, travailler dans la santé…",
  });
  textarea.value = etat.aspiration || "";
  textarea.addEventListener("input", () => definirAspiration(textarea.value));

  // Compteur "X / 3 sélectionné(s)"
  const counter = el("p", { class: "domaine-counter" }, "");

  // Map id → card DOM pour mise à jour état
  const carteParId = new Map();

  function mettreAJourCartes() {
    const n = selectionnes.length;
    counter.textContent = `${n} / ${MAX_DOMAINES} sélectionné${n !== 1 ? "s" : ""}`;
    for (const [id, card] of carteParId) {
      const sel = selectionnes.includes(id);
      const dispo = sel || selectionnes.length < MAX_DOMAINES;
      card.classList.toggle("is-selected", sel);
      card.classList.toggle("is-disabled", !dispo);
    }
    definirDomaines(selectionnes);
  }

  // Cartes domaines
  const cartes = domaines.map((d) => {
    const card = el(
      "button",
      { class: "domaine-card", type: "button" },
      ico(d.icone || "bookmark", 28),
      el("span", {}, d.nom)
    );
    carteParId.set(d.id, card);
    card.addEventListener("click", () => {
      const idx = selectionnes.indexOf(d.id);
      if (idx >= 0) {
        selectionnes.splice(idx, 1);
      } else if (selectionnes.length < MAX_DOMAINES) {
        selectionnes.push(d.id);
      }
      // Si max atteint et carte non sélectionnée : rien (pas d'erreur)
      mettreAJourCartes();
    });
    return card;
  });

  // État initial des cartes
  mettreAJourCartes();

  const grille = domaines.length > 0
    ? el("div", { class: "domaine-grid" }, ...cartes)
    : el("p", { class: "muted" }, "Passe cette étape si tu veux voir toutes les filières éligibles.");

  monter(
    mount,
    stepper(3),
    el(
      "section",
      { class: "card stack" },
      el("h1", {}, "Quel domaine t'intéresse ?"),
      el(
        "p",
        { class: "muted" },
        "Choisis 1 à 3 domaines — les filières correspondantes seront mises en avant. Tu peux aussi passer directement aux résultats."
      ),
      counter,
      grille,
      el(
        "details",
        { class: "aspiration-details" },
        el("summary", {}, "Affiner avec tes propres mots (optionnel)"),
        el(
          "div",
          { class: "field" },
          el("label", { for: "aspiration" }, "Ton aspiration"),
          textarea
        )
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
