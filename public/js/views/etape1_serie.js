// =============================================================================
// views/etape1_serie.js — Étape 1 : choix de la série de bac
// -----------------------------------------------------------------------------
// Le menu est peuplé DYNAMIQUEMENT à partir des vraies valeurs de
// criteres_classement.serie_bac (jamais une liste statique).
// =============================================================================

import { chargerDonnees } from "../data/queries.js";
import { extractSeriesDistinctes } from "../lib/serieParser.js";
import { lireEtat, definirSerie } from "../store.js";
import {
  el,
  monter,
  stepper,
  chargement,
  boiteErreur,
  encartAvertissement,
} from "../ui.js";

export async function render(mount) {
  monter(mount, stepper(1), chargement("Chargement des séries…"));

  let donnees;
  try {
    donnees = await chargerDonnees();
  } catch (e) {
    monter(mount, stepper(1), boiteErreur(e.message, e.cause && e.cause.message));
    return;
  }

  const series = extractSeriesDistinctes(donnees.criteres);
  const etat = lireEtat();

  // Aucune série disponible (table criteres_classement vide ou non lisible pour
  // la clé anon) : on explique au lieu de laisser un menu déroulant vide.
  if (series.length === 0) {
    monter(
      mount,
      stepper(1),
      el(
        "section",
        { class: "card stack" },
        el("h1", {}, "Séries indisponibles"),
        encartAvertissement(
          "La liste des séries n'a pas pu être chargée : les critères de classement ne sont pas accessibles pour le moment. Réessaie dans un instant."
        ),
        el(
          "button",
          { class: "btn btn--primary", onclick: () => location.reload() },
          "Réessayer"
        )
      )
    );
    return;
  }

  const select = el(
    "select",
    { id: "serie", "aria-label": "Série de bac" },
    el("option", { value: "" }, "— Choisis ta série —"),
    series.map((s) =>
      el("option", { value: s, ...(etat.serie === s ? { selected: "" } : {}) }, s)
    )
  );

  const continuer = el(
    "a",
    {
      class: "btn btn--primary btn--block",
      href: "#/etape2",
      ...(etat.serie ? {} : { "aria-disabled": "true" }),
    },
    "Continuer"
  );

  select.addEventListener("change", () => {
    const v = select.value || null;
    definirSerie(v); // autosave
    if (v) continuer.removeAttribute("aria-disabled");
    else continuer.setAttribute("aria-disabled", "true");
  });

  monter(
    mount,
    stepper(1),
    el(
      "section",
      { class: "card stack" },
      el("h1", {}, "Quelle est ta série de bac ?"),
      el(
        "p",
        { class: "muted" },
        "On affiche les filières de l'UAC où cette série apparaît dans les critères de classement officiels."
      ),
      el("div", { class: "field" }, el("label", { for: "serie" }, "Série"), select),
      continuer
    )
  );
}
