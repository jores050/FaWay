// =============================================================================
// views/etape2_notes.js — Étape 2 : notes par matière (OPTIONNEL)
// -----------------------------------------------------------------------------
// - Un champ par matière BRUTE (texte affiché tel quel, jamais renormalisé) des
//   filières compatibles avec la série choisie.
// - Bouton "Passer cette étape" toujours visible -> mode "juste éligibilité".
// =============================================================================

import { chargerDonnees } from "../data/queries.js";
import { matieresPourSerie } from "../engine/filtrage.js";
import { lireEtat, definirNote, definirCoef, definirMoyenneBac } from "../store.js";
import { el, monter, stepper, chargement, boiteErreur, encartInfo } from "../ui.js";
import { naviguer } from "../router.js";
import { trouverCoefficient } from "../lib/coefficients.js";

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
          matieres.map((m) => {
            const coefTableau = trouverCoefficient(m, etat.serie)?.coef ?? null;
            return champNote(m, etat.notes[m], etat.coefs?.[m] ?? null, coefTableau);
          }),
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

  const msgValidation = el("p", { class: "validation-douce", style: "display:none" },
    "Pour estimer tes chances d'admission, saisis au moins une note et ta moyenne générale du bac. Tu peux aussi continuer sans — tu verras les filières éligibles sans estimation."
  );
  let _validationVue = false;
  const btnContinuer = el("button", { class: "btn btn--primary", type: "button" }, "Continuer →");
  btnContinuer.addEventListener("click", () => {
    const s = lireEtat();
    const aNotes = Object.values(s.notes || {}).some((v) => v != null);
    const aMoy   = s.moyenneBac != null;
    if (!aNotes && !aMoy && !_validationVue) {
      msgValidation.style.display = "";
      _validationVue = true;
      return;
    }
    naviguer("#/etape3");
  });

  monter(
    mount,
    stepper(2),
    el(
      "section",
      { class: "card stack" },
      el("h1", {}, "Tes notes"),
      el(
        "p",
        { class: "muted" },
        "Série sélectionnée : ",
        el("strong", {}, etat.serie),
        ". Les notes permettent de calculer ta ",
        el("strong", {}, "moyenne de classement officielle"),
        " — formule pondérée du Ministère (arrêté N°016-2003), coefficients intégrés."
      ),
      champMoyenneBac(etat.moyenneBac),
      champs,
      el(
        "div",
        { class: "actions actions--between" },
        el("a", { class: "btn btn--ghost", href: "#/etape1" }, "← Retour"),
        el("div", { style: "display:flex;flex-direction:column;align-items:flex-end;gap:.4rem" },
          msgValidation,
          btnContinuer
        )
      )
    )
  );
}

/**
 * Bloc de saisie de la moyenne générale du bac (sur 20).
 * Cette valeur NE sert PAS au calcul de la moyenne de classement ;
 * elle est uniquement utilisée pour les conditions d'accès aux concours.
 */
function champMoyenneBac(valeurActuelle) {
  const input = el("input", {
    type: "number",
    min: "0",
    max: "20",
    step: "0.01",
    inputmode: "decimal",
    placeholder: "ex. 12.50",
    value: valeurActuelle != null ? String(valeurActuelle) : "",
    id: "moyenne-bac-input",
  });

  input.addEventListener("input", () => {
    const brut = input.value.trim();
    if (brut === "") { definirMoyenneBac(null); return; }
    const n = Number(brut);
    if (Number.isNaN(n)) return;
    definirMoyenneBac(n);
  });

  return el(
    "div",
    { class: "field field--moy-bac" },
    el("label", { class: "field__matiere-label", for: "moyenne-bac-input" }, "Moyenne générale du Bac"),
    el(
      "div",
      { class: "field__row" },
      el(
        "div",
        { class: "field__col" },
        el("span", { class: "field__sub-label" }, "Sur 20"),
        input
      ),
      el(
        "div",
        { class: "field__col", style: "flex:2" },
        el(
          "p",
          { class: "muted", style: "font-size:.82rem;margin:0;padding-top:1.4rem" },
          "La moyenne globale inscrite sur ton relevé de bac. Utile pour les conditions d’accès aux concours."
        )
      )
    )
  );
}

/**
 * Ligne de saisie pour une matière : note /20 + coefficient pré-rempli (modifiable).
 * @param {string}      matiereBrute  Libellé résolu affiché (ex. "Maths", "Electrotechnique")
 * @param {number|null} valeurNote    Note stockée dans le store (ou undefined)
 * @param {number|null} valeurCoef    Coefficient déjà modifié par l'élève (store) — null = intact
 * @param {number|null} coefTableau   Coefficient de la table officielle — null = introuvable
 */
function champNote(matiereBrute, valeurNote, valeurCoef, coefTableau) {
  // ── Champ note ─────────────────────────────────────────────────────────────
  const inputNote = el("input", {
    type: "number",
    min: "0",
    max: "20",
    step: "0.25",
    inputmode: "decimal",
    placeholder: "0–20",
    value: valeurNote != null ? String(valeurNote) : "",
  });

  inputNote.addEventListener("input", () => {
    const brut = inputNote.value.trim();
    if (brut === "") { definirNote(matiereBrute, null); return; }
    let n = Number(brut);
    if (Number.isNaN(n)) return;
    n = Math.min(20, Math.max(0, n));
    definirNote(matiereBrute, n);
  });

  // ── Champ coefficient ───────────────────────────────────────────────────────
  // Valeur affichée : coef modifié par l'élève (priorité) ou coef de la table
  const coefAffiche = valeurCoef != null ? String(valeurCoef)
                    : coefTableau != null ? String(coefTableau)
                    : "";

  const inputCoef = el("input", {
    type: "number",
    min: "0.5",
    max: "10",
    step: "0.5",
    inputmode: "decimal",
    placeholder: "ex. 4",
    value: coefAffiche,
    title: "Coefficient officiel pré-rempli. Modifie si ta situation est particulière.",
  });

  // Alerte douce pour coefficient aberrant (créée cachée, montrée si besoin)
  const alerteCoef = el(
    "span",
    { class: "field__coef-warn", style: "display:none" },
    "Coefficient suspect — doit être entre 0.5 et 10."
  );

  // Indice si coefficient introuvable dans la table
  const hinteCoef = coefTableau == null
    ? el("span", { class: "field__coef-hint" }, "Non trouvé auto — saisis depuis ton relevé de notes.")
    : null;

  inputCoef.addEventListener("input", () => {
    const brut = inputCoef.value.trim();
    if (brut === "") {
      alerteCoef.style.display = "none";
      definirCoef(matiereBrute, null); // revient au coef de la table
      return;
    }
    const c = Number(brut);
    if (Number.isNaN(c)) return;
    if (c <= 0 || c > 10) {
      alerteCoef.style.display = "";
    } else {
      alerteCoef.style.display = "none";
    }
    definirCoef(matiereBrute, c);
  });

  return el(
    "div",
    { class: "field" },
    el("span", { class: "field__matiere-label" }, matiereBrute),
    el(
      "div",
      { class: "field__row" },
      el(
        "div",
        { class: "field__col" },
        el("span", { class: "field__sub-label" }, "Note /20"),
        inputNote
      ),
      el(
        "div",
        { class: "field__col field__col--coef" },
        el("span", { class: "field__sub-label" }, "Coefficient"),
        inputCoef,
        alerteCoef,
        hinteCoef
      )
    )
  );
}
