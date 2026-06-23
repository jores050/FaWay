// =============================================================================
// views/etape1_serie.js — Étape 1 : choix de la série de bac (cartes visuelles)
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

// Groupes pour organiser les cartes de séries
const GROUPES = [
  { titre: "Séries générales (littéraires & sciences humaines)", codes: ["A1", "A2", "B"] },
  { titre: "Séries scientifiques générales", codes: ["C", "D"] },
  { titre: "Séries techniques industrielles", codes: ["E", "F1", "F2", "F3", "F4"] },
  { titre: "Séries commerciales & administratives", codes: ["G1", "G2", "G3"] },
  { titre: "Série eau & assainissement", codes: ["EA"] },
];

export async function render(mount) {
  monter(mount, stepper(1), chargement("Chargement des séries…"));

  let donnees;
  try {
    donnees = await chargerDonnees();
  } catch (e) {
    monter(mount, stepper(1), boiteErreur(e.message, e.cause && e.cause.message));
    return;
  }

  const seriesDisponibles = new Set(extractSeriesDistinctes(donnees.criteres));
  const etat = lireEtat();

  if (seriesDisponibles.size === 0) {
    monter(
      mount,
      stepper(1),
      el(
        "section",
        { class: "card stack" },
        el("h1", {}, "Séries indisponibles"),
        encartAvertissement(
          "La liste des séries n'a pas pu être chargée. Réessaie dans un instant."
        ),
        el("button", { class: "btn btn--primary", onclick: () => location.reload() }, "Réessayer")
      )
    );
    return;
  }

  // Séries disponibles dans la base mais absentes des groupes définis
  const codesGroupe = new Set(GROUPES.flatMap((g) => g.codes));
  const seriesHorsGroupe = [...seriesDisponibles].filter((s) => !codesGroupe.has(s)).sort();

  // Bouton Continuer (activé quand une série est sélectionnée)
  const continuer = el(
    "a",
    {
      class: "btn btn--primary btn--block",
      href: "#/etape2",
      ...(etat.serie ? {} : { "aria-disabled": "true" }),
    },
    "Continuer →"
  );

  // Ensemble des cartes créées pour pouvoir les mettre à jour facilement
  const cartes = new Map(); // code → élément DOM

  function selectionner(code) {
    // Désélectionner l'ancienne carte
    for (const [c, node] of cartes) {
      node.classList.toggle("is-selected", c === code);
      node.setAttribute("aria-pressed", c === code ? "true" : "false");
    }
    definirSerie(code);
    if (code) continuer.removeAttribute("aria-disabled");
    else continuer.setAttribute("aria-disabled", "true");
  }

  // Construire les groupes de cartes
  const groupesEls = GROUPES.map((groupe) => {
    const codesPresents = groupe.codes.filter((c) => seriesDisponibles.has(c));
    if (codesPresents.length === 0) return null;

    const grid = el(
      "div",
      { class: "series-grid" },
      codesPresents.map((code) => {
        const carte = el(
          "button",
          {
            class: "serie-card" + (etat.serie === code ? " is-selected" : ""),
            type: "button",
            "aria-pressed": etat.serie === code ? "true" : "false",
            "aria-label": `Série ${code}`,
          },
          code
        );
        carte.addEventListener("click", () => selectionner(code));
        cartes.set(code, carte);
        return carte;
      })
    );

    return el(
      "div",
      { class: "series-groupe" },
      el("p", { class: "series-groupe__titre" }, groupe.titre),
      grid
    );
  }).filter(Boolean);

  // Séries hors groupes (au cas où la base en aurait de nouvelles)
  if (seriesHorsGroupe.length > 0) {
    const grid = el(
      "div",
      { class: "series-grid" },
      seriesHorsGroupe.map((code) => {
        const carte = el(
          "button",
          {
            class: "serie-card" + (etat.serie === code ? " is-selected" : ""),
            type: "button",
            "aria-pressed": etat.serie === code ? "true" : "false",
            "aria-label": `Série ${code}`,
          },
          code
        );
        carte.addEventListener("click", () => selectionner(code));
        cartes.set(code, carte);
        return carte;
      })
    );
    groupesEls.push(
      el(
        "div",
        { class: "series-groupe" },
        el("p", { class: "series-groupe__titre" }, "Autres séries"),
        grid
      )
    );
  }

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
        "Sélectionne ta série. On affichera uniquement les filières où tu apparais dans les critères de classement officiels."
      ),
      ...groupesEls,
      continuer
    )
  );
}
