// =============================================================================
// views/landing.js — Écran d'accueil : pitch court + CTA "Trouve ta filière"
// =============================================================================

import { el, monter } from "../ui.js";

export function render(mount) {
  monter(
    mount,
    el(
      "section",
      { class: "hero stack" },
      el("h1", {}, "Ton orientation universitaire au Bénin"),
      el(
        "p",
        {},
        "Dis-nous ta série de bac : on te montre toutes les filières universitaires du Bénin où tu es éligible — UAC, UNA, Université de Parakou, UNSTIM — à partir du Guide d'Orientation officiel du Ministère."
      ),
      el(
        "div",
        { class: "actions text-center", style: "justify-content:center;margin-top:1rem" },
        el("a", { class: "btn btn--primary", href: "#/etape1" }, "Trouve ta filière")
      )
    ),
    el(
      "ul",
      { class: "feature-list card" },
      el(
        "li",
        {},
        el("span", { class: "ico" }, "🎯"),
        el(
          "span",
          {},
          el("strong", {}, "Éligibilité fiable. "),
          "On lit ta série dans les vrais critères de classement, sans approximation."
        )
      ),
      el(
        "li",
        {},
        el("span", { class: "ico" }, "🧮"),
        el(
          "span",
          {},
          el("strong", {}, "Estimation honnête. "),
          "Tes notes donnent une moyenne non pondérée — jamais une fausse « moyenne officielle »."
        )
      ),
      el(
        "li",
        {},
        el("span", { class: "ico" }, "📄"),
        el(
          "span",
          {},
          el("strong", {}, "Sources affichées. "),
          "Quotas et page du guide sont indiqués pour chaque filière."
        )
      )
    )
  );
}
