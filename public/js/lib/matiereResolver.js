// =============================================================================
// matiereResolver.js — Résolution des libellés de matière CONDITIONNELS par série
// -----------------------------------------------------------------------------
// POURQUOI (contrainte données réelles) :
//   `criteres_classement.matiere` est du TEXTE LIBRE qui encode souvent des
//   variantes selon la série de bac. Exemples réels (UAC) :
//     "Maths ou Etude de Cas (G)"               -> Maths, sauf séries G -> Etude de Cas
//     "Hist-Geo/Anglais (DT/STI)"               -> Hist-Geo, sauf DT/STI -> Anglais
//     "SVT (Mobilisation ... pour EA)"          -> SVT, sauf EA -> Mobilisation ...
//     "PCT (LV1 pour A et Economie pour B)"     -> PCT, sauf A -> LV1, B -> Economie
//     "Economie (B) / Maths (C-D) / Etude de Cas (G)" -> selon la série
//
//   On RÉSOUT chaque libellé POUR la série de l'utilisateur AVANT déduplication,
//   pour n'afficher que la matière qui le concerne réellement (ex. série C ne doit
//   jamais voir "(DT/STI)" ou "pour EA").
//
// RÈGLE DE SÉCURITÉ : si un libellé ne correspond à AUCUN format reconnu, ou si on
//   ne peut pas déterminer la branche applicable, on RETOURNE LE LIBELLÉ BRUT (et
//   on logge pour audit) plutôt que de deviner. Mieux vaut un champ verbeux qu'une
//   résolution silencieusement fausse.
//
// Module PUR (aucune dépendance navigateur) -> testable sous Node.
// =============================================================================

import { normalizeToken } from "./serieParser.js";

/**
 * La série de l'utilisateur appartient-elle au "groupe" décrit (entre parenthèses) ?
 * Gère les formes réelles : "A", "B", "EA", "G", "C-D", "G1-G2-G3", "E et F",
 * "DT/STI", "les A et B"…  Une lettre de famille (A, G, F, E) matche ses déclinaisons
 * chiffrées (A1/A2, G1..G3, F1..F4) mais PAS un autre code (ex. "E" ne matche pas "EA").
 */
function serieDansGroupe(serie, groupeStr) {
  const cible = normalizeToken(serie);
  if (!cible) return false;
  const tokens = String(groupeStr)
    .replace(/\s+et\s+/gi, ",") // "E et F" -> "E,F" ; "les A et B" -> "les A,B"
    .split(/[,\-]+|\s+/) // virgules, tirets, espaces ; on GARDE le "/" (DT/STI)
    .map((t) => normalizeToken(t))
    .filter(Boolean);
  return tokens.some((t) => {
    if (cible === t) return true; // égalité exacte (C, EA, DT/STI…)
    // Famille : "A" -> A1/A2, "G" -> G1/G2/G3, "F" -> F1..F4 (caractère suivant = chiffre).
    if (cible.startsWith(t) && /\d/.test(cible.charAt(t.length))) return true;
    return false;
  });
}

/**
 * Un "groupe" entre parenthèses désigne-t-il des SÉRIES (B, C-D, G…) plutôt qu'un
 * simple qualificatif (LV1, LV2, "autres") ? Un qualificatif sert de branche par
 * défaut ; une condition de série, elle, ne s'applique qu'à la série visée.
 */
function estGroupeSerie(groupeStr) {
  const tokens = String(groupeStr)
    .replace(/\s+et\s+/gi, ",")
    .split(/[,\-]+|\s+/)
    .map((t) => normalizeToken(t))
    .filter(Boolean);
  return tokens.some(
    (t) => /^[A-H]\d{0,2}$/.test(t) || /^(DT|DEAT)\//.test(t) || t === "EA" || t === "DEAT" || t === "DT"
  );
}

/** Conserve le libellé brut et logge le cas pour audit ultérieur. */
function brutEtLog(libelle) {
  if (typeof console !== "undefined" && console.warn) {
    console.warn("[resoudreMatiere] format non résolu, libellé brut conservé :", libelle);
  }
  return libelle;
}

/**
 * FORMAT 4 : "VALEUR1 (GROUPE1) / VALEUR2 (GROUPE2) [ ou VALEUR3 (GROUPE3) ]"
 * Segments séparés par "/" OU " ou ", chacun qualifié par son propre groupe.
 *  - groupe = condition de série -> ne s'applique qu'à cette série,
 *  - groupe = qualificatif (LV1/LV2…) -> sert de branche PAR DÉFAUT.
 * @returns {string|null} valeur résolue ; "" si la matière n'est PAS applicable à la
 *   série (conditions de série présentes mais aucune ne correspond) ; null si non reconnu.
 */
function resoudreFormat4(brut, serie) {
  const segments = brut.split(/\s*\/\s*|\s+ou\s+/i);
  let defaut = null; // valeur d'un segment à groupe non-série (qualificatif)
  let aGroupeSerie = false; // au moins un segment porte une condition de série
  for (const seg of segments) {
    const s = seg.trim();
    const pi = s.indexOf("(");
    if (pi <= 0) continue; // pas de "VALEUR (…)" exploitable
    const valeur = s.slice(0, pi).trim();
    const groupes = (s.match(/\(([^()]*)\)/g) || []).map((g) => g.slice(1, -1));
    const groupesSerie = groupes.filter(estGroupeSerie);
    if (groupesSerie.length) {
      aGroupeSerie = true;
      if (groupesSerie.some((g) => serieDansGroupe(serie, g))) return valeur;
    } else if (defaut === null) {
      defaut = valeur; // qualificatif (LV1/LV2/autres) -> valeur par défaut
    }
  }
  if (defaut !== null) return defaut; // pas de branche série, mais un défaut existe
  if (aGroupeSerie) return ""; // conditions de série présentes, aucune applicable -> NON APPLICABLE
  return null; // format non reconnu
}

/**
 * Résout un libellé de matière pour la série de bac choisie.
 * @param {string} libelleBrut  Valeur brute de criteres_classement.matiere.
 * @param {string} serieUtilisateur  Code de série choisi (ex. "C", "EA", "DT/STI").
 * @returns {string} Libellé simple résolu (ex. "Maths") ou le brut si non résolu.
 */
export function resoudreMatiere(libelleBrut, serieUtilisateur) {
  const brut = String(libelleBrut == null ? "" : libelleBrut).trim();
  // Cas par défaut : aucune parenthèse -> matière simple, rien à résoudre.
  if (brut === "" || !brut.includes("(")) return brut;

  try {
    const nbGroupes = (brut.match(/\(([^()]*)\)/g) || []).length;

    // FORMAT 4 : plusieurs segments "VALEUR (GROUPE)".
    if (nbGroupes >= 2) {
      const r = resoudreFormat4(brut, serieUtilisateur);
      return r !== null ? r : brutEtLog(brut);
    }

    // À partir d'ici : exactement un groupe parenthésé. Découpe base / contenu.
    const idx = brut.indexOf("(");
    const base = brut.slice(0, idx).trim();
    const dedans = brut.slice(idx + 1, brut.lastIndexOf(")")).trim();

    // FORMAT 2 : "BASE1/BASE2 (GROUPE)" — la base contient un slash.
    //   Hors groupe -> 1re partie ; dans le groupe -> 2e partie (variante).
    if (base.includes("/")) {
      const [base1, base2] = base.split("/").map((s) => s.trim());
      return serieDansGroupe(serieUtilisateur, dedans) ? base2 || base1 : base1;
    }

    // FORMAT 3 : "BASE ou ALTERNATIVE (GROUPE)".
    if (/\sou\s/i.test(base)) {
      const [b1, b2] = base.split(/\s+ou\s+/i).map((s) => s.trim());
      return serieDansGroupe(serieUtilisateur, dedans) ? b2 || b1 : b1;
    }

    // FORMAT 1 : "BASE (ALT pour GROUPE)", éventuellement multi-clauses
    //   "X pour A et Y pour B". On ne coupe sur " et " QUE devant un nouveau "… pour".
    if (/\spour\s/i.test(dedans)) {
      const clauses = dedans.split(/\s+et\s+(?=\S+\s+pour\s+)/i);
      for (const clause of clauses) {
        const m = clause.match(/^(.*?)\s+pour\s+(.+)$/i);
        if (!m) continue;
        if (serieDansGroupe(serieUtilisateur, m[2].trim())) return m[1].trim();
      }
      return base; // aucune condition applicable -> matière de base
    }

    // Parenthèse non conditionnelle (ex. "Anglais (LV1)") : qualifiant -> on garde la base.
    return base || brutEtLog(brut);
  } catch (e) {
    return brutEtLog(brut);
  }
}
