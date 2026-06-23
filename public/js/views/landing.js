// =============================================================================
// views/landing.js — Accueil : hero trajectoire + features
// =============================================================================

import { el, ico, monter } from "../ui.js";

export function render(mount) {
  monter(
    mount,
    el(
      "section",
      { class: "hero" },
      el("div", { class: "hero__eyebrow" }, "Guide officiel du Ministère · Gratuit"),
      el(
        "h1",
        {},
        "Trouve ta filière ",
        el("em", {}, "idéale"),
        " au Bénin"
      ),
      el(
        "p",
        { class: "hero__sub" },
        "Saisis ta série de bac et tes notes. On te montre toutes les filières universitaires où tu es éligible — avec ta moyenne de classement officielle et tes chances d'admission estimées."
      ),
      el(
        "div",
        { class: "hero__cta actions", style: "justify-content:center" },
        el("a", { class: "btn btn--amber", href: "#/etape1", style: "font-size:1rem;padding:.75rem 1.75rem" }, "Trouver ma filière →")
      ),
      el(
        "div",
        { class: "hero__coverage" },
        el("span", { class: "hero__univ-badge" }, "UAC"),
        el("span", { class: "hero__univ-badge" }, "UNA"),
        el("span", { class: "hero__univ-badge" }, "Université de Parakou"),
        el("span", { class: "hero__univ-badge" }, "UNSTIM"),
      )
    ),
    el(
      "ul",
      { class: "feature-list card" },
      el(
        "li",
        {},
        el("div", { class: "feature-list__icon" }, ico("target", 18)),
        el(
          "span",
          {},
          el("strong", {}, "Éligibilité fiable. "),
          "On lit ta série dans les vrais critères de classement officiels — aucune approximation, aucun faux positif."
        )
      ),
      el(
        "li",
        {},
        el("div", { class: "feature-list__icon" }, ico("calculator", 18)),
        el(
          "span",
          {},
          el("strong", {}, "Calcul officiel. "),
          "Tes notes donnent ta vraie moyenne pondérée (formule du Ministère, arrêté N°016-2003). Coefficients par série intégrés."
        )
      ),
      el(
        "li",
        {},
        el("div", { class: "feature-list__icon" }, ico("trending-up", 18)),
        el(
          "span",
          {},
          el("strong", {}, "Chances estimées. "),
          "Un indicateur visuel te montre où tu te situes par rapport au seuil habituel de chaque filière — pour orienter ta stratégie."
        )
      ),
      el(
        "li",
        {},
        el("div", { class: "feature-list__icon" }, ico("file-text", 18)),
        el(
          "span",
          {},
          el("strong", {}, "Sources transparentes. "),
          "Quotas et page du guide sont indiqués pour chaque filière. Tu pois vérifier toi-même."
        )
      )
    )
  );
}
