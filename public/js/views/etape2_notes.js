// =============================================================================
// views/etape2_notes.js — Étape 2 : notes par matière (OPTIONNEL)
// -----------------------------------------------------------------------------
// - Un champ par matière BRUTE (texte affiché tel quel, jamais renormalisé) des
//   filières compatibles avec la série choisie.
// - Bouton "Passer cette étape" toujours visible -> mode "juste éligibilité".
// =============================================================================

import { chargerDonnees } from "../data/queries.js";
import { matieresPourSerie } from "../engine/filtrage.js";
import { lireEtat, definirNote } from "../store.js";
import { el, monter, stepper, chargement, boiteErreur, encartInfo } from "../ui.js";
import { naviguer } from "../router.js";

export async function render(mount) {
  const etat = lireEtat();
  if (!etat.serie) {
    naviguer("#/etape1"); // série obligatoire avant les notes
    return;
  }

  monter(mount, stepper(2), chargement("Préparation des matières…"));

  let donnees;
  try {
    donnees = await chargerDonnees();
  } catch (e) {
    monter(mount, stepper(2), boiteErreur(e.message, e.cause && e.cause.message));
    return;
  }

  const matieres = matieresPourSerie(donnees, etat.serie);

  const champs =
    matieres.length === 0
      ? encartInfo(
          "Aucune matière de sélection précisée pour la série « ",
          el("strong", {}, etat.serie),
          " » dans les filières concernées. Tu peux passer cette étape."
        )
      : el(
          "div",
          {},
          el(
            "p",
            { class: "hint" },
            "Saisis tes notes sur 20 (laisse vide si tu ne sais pas). L'estimation n'apparaît que pour les filières où toutes les matières sont renseignées."
          ),
          matieres.map((m) => champNote(m, etat.notes[m])),
          el(
            "p",
            { class: "muted", style: "font-size:.82rem;margin-top:.75rem" },
            "Seules les matières des filières admises au ",
            el("strong", {}, "classement"),
            " sont demandées ici. Les filières sur ",
            el("strong", {}, "concours"),
            " sont évaluées sur épreuves : elles restent dans tes résultats, sans moyenne estimée."
          )
        );

  monter(
    mount,
    stepper(2),
    el(
      "section",
      { class: "card stack" },
      el("h1", {}, "Tes notes (optionnel)"),
      el(
        "p",
        { class: "muted" },
        "Série sélectionnée : ",
        el("strong", {}, etat.serie),
        ". Les notes servent à une estimation ",
        el("em", {}, "non pondérée"),
        " — le Ministère ne publie pas de coefficients."
      ),
      champs,
      el(
        "div",
        { class: "actions actions--between" },
        el("a", { class: "btn btn--ghost", href: "#/etape1" }, "← Retour"),
        el(
          "div",
          { class: "actions" },
          el("a", { class: "btn", href: "#/etape3" }, "Passer cette étape"),
          el("a", { class: "btn btn--primary", href: "#/etape3" }, "Continuer")
        )
      )
    )
  );
}

/** Champ de saisie d'une note pour une matière brute. */
function champNote(matiereBrute, valeurActuelle) {
  const input = el("input", {
    type: "number",
    min: "0",
    max: "20",
    step: "0.25",
    inputmode: "decimal",
    placeholder: "0–20",
    value: valeurActuelle !== undefined ? String(valeurActuelle) : "",
  });

  input.addEventListener("input", () => {
    const brut = input.value.trim();
    if (brut === "") {
      definirNote(matiereBrute, null); // efface
      return;
    }
    let n = Number(brut);
    if (Number.isNaN(n)) return;
    n = Math.min(20, Math.max(0, n)); // borne 0–20
    definirNote(matiereBrute, n); // autosave
  });

  return el(
    "div",
    { class: "field" },
    // Le libellé est le texte BRUT de la matière (variantes conditionnelles incluses).
    el("label", {}, matiereBrute),
    input
  );
}
