// =============================================================================
// views/etape3_aspiration.js — Étape 3 : aspiration (obligatoire) + domaines (optionnel)
// -----------------------------------------------------------------------------
// L'aspiration est le champ principal — elle alimente le filtre "Adaptées à ton
// aspiration" via les embeddings. Les domaines restent facultatifs (affinage).
// =============================================================================

import { lireEtat, definirAspiration, definirDomaines } from "../store.js";
import { el, ico, monter, stepper } from "../ui.js";
import { chargerDomaines } from "../data/queries.js";
import { naviguer } from "../router.js";

const MAX_DOMAINES = 3;

export async function render(mount) {
  const etat = lireEtat();
  if (!etat.serie) {
    naviguer("#/etape1");
    return;
  }

  let domaines = [];
  try {
    domaines = await chargerDomaines();
  } catch {
    // Silencieux : section domaines vide si indisponible
  }

  let selectionnes = Array.isArray(etat.domaines) ? [...etat.domaines] : [];

  // ── Textarea aspiration — champ principal ────────────────────────────────
  const textarea = el("textarea", {
    id:          "aspiration",
    rows:        "4",
    placeholder: "Ex. : je veux travailler dans la santé, soigner les gens, peut-être faire médecine ou infirmier…",
    class:       "textarea--aspiration",
  });
  textarea.value = etat.aspiration || "";
  textarea.addEventListener("input", () => definirAspiration(textarea.value));

  const msgValidation = el("p", { class: "validation-douce", style: "display:none" },
    "Décris ton projet en quelques mots — même vaguement. Ça permet de personnaliser le filtre « Adaptées à ton aspiration »."
  );
  let _validationVue = false;

  const btnResultats = el("button", { class: "btn btn--primary", type: "button" }, "Voir mes résultats →");
  btnResultats.addEventListener("click", () => {
    const asp = textarea.value.trim();
    if (!asp && !_validationVue) {
      msgValidation.style.display = "";
      _validationVue = true;
      textarea.focus();
      return;
    }
    naviguer("#/resultats");
  });

  // ── Cartes domaines — section optionnelle ────────────────────────────────
  const counter = el("p", { class: "domaine-counter" }, "");
  const carteParId = new Map();

  function mettreAJourCartes() {
    const n = selectionnes.length;
    counter.textContent = `${n} / ${MAX_DOMAINES} sélectionné${n !== 1 ? "s" : ""}`;
    for (const [id, card] of carteParId) {
      const sel  = selectionnes.includes(id);
      const dispo = sel || selectionnes.length < MAX_DOMAINES;
      card.classList.toggle("is-selected", sel);
      card.classList.toggle("is-disabled", !dispo);
    }
    definirDomaines(selectionnes);
  }

  const cartes = domaines.map((d) => {
    const card = el("button", { class: "domaine-card", type: "button" },
      ico(d.icone || "bookmark", 24),
      el("span", {}, d.nom)
    );
    carteParId.set(d.id, card);
    card.addEventListener("click", () => {
      const idx = selectionnes.indexOf(d.id);
      if (idx >= 0) selectionnes.splice(idx, 1);
      else if (selectionnes.length < MAX_DOMAINES) selectionnes.push(d.id);
      mettreAJourCartes();
    });
    return card;
  });

  mettreAJourCartes();

  const sectionDomaines = domaines.length > 0
    ? el("details", { class: "aspiration-details domaine-optionnel" },
        el("summary", {}, "Affiner par domaine (optionnel — 1 à 3)"),
        el("div", { class: "domaine-details-inner" },
          counter,
          el("div", { class: "domaine-grid" }, ...cartes)
        )
      )
    : null;

  monter(
    mount,
    stepper(3),
    el(
      "section",
      { class: "card stack" },
      el("h1", {}, "Ton projet en quelques mots"),
      el("p", { class: "muted" },
        "Décris ce que tu veux faire après le bac. Ce texte alimente le filtre ",
        el("strong", {}, "« Adaptées à ton aspiration »"),
        " — sois concret, même une phrase suffit."
      ),
      el("div", { class: "field" },
        el("label", { for: "aspiration", class: "field__matiere-label" }, "Ton aspiration"),
        textarea,
        msgValidation
      ),
      sectionDomaines,
      el(
        "div",
        { class: "actions actions--between" },
        el("a", { class: "btn btn--ghost", href: "#/etape2" }, "← Retour"),
        btnResultats
      )
    )
  );
}
