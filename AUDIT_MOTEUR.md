# AUDIT_MOTEUR — Moteur d'orientation IAOrientation

> Document généré pour audit externe. Aucun secret, URL réelle ou donnée d'élève.
> Objectif : permettre à un auditeur d'évaluer la qualité de la logique sans disposer du projet complet.

---

## 0. Vue d'ensemble du pipeline

```
Étape 1 – Série de bac choisie par l'élève
    │
    ▼
[Couche 1 — DÉTERMINISTE]
    serieParser.matchSerie()        → filières éligibles (série exacte ou toutes-séries)
    matiereResolver.resoudreMatiere()→ résolution matières conditionnelles
    filtrage.calculerMoyenneClassement() → moyenne pondérée officielle (si notes)
    │
    ▼
[Couche 2 — SCORING]
    scoring.calculerScoreComposite()→ score [0–1] en 5 composantes pondérées
    seuilsAdmission.calculerChancesAdmission() → pourcentage estimé + zone
    │
    ▼
[Couche 3 — IA, NON BLOQUANTE]
    semantique.classerParSemantique() → reranking par similarité cosinus (Edge Fn)
    justifications.genererJustifications() → texte IA top 5 (Edge Fn, slot DOM)
    conditionsBac.evaluerConditionMoyenneBac() → badges/alertes concours spéciaux
```

---

## 1. Filtrage de la série (Couche 1)

**Fichier :** `public/js/lib/serieParser.js`

La colonne `serie_bac` de la base est du **texte libre composite** (ex. `"A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI"`). Un simple `LIKE '%D%'` matcherait "DT", "DEAT", "DT/STI". La logique découpe en **tokens isolés** et compare par **égalité exacte**.

```js
// Garantie anti-faux-positif : "D" ne matche PAS "DT/STI" ni "DEAT"
export function matchSerie(codeChoisi, serieBacText) {
  const { toutesSeries, tokens } = parse(serieBacText);
  if (toutesSeries) return true;                      // wildcard "Toutes séries confondues"
  if (codeChoisi == null) return false;
  const cible = normalizeToken(codeChoisi);           // normalise : trim, sans accents, majuscules
  if (cible === "") return false;
  return tokens.some((t) => normalizeToken(t) === cible); // ÉGALITÉ EXACTE seulement
}

// Parsing : retire les qualificatifs entre parenthèses ; ne coupe "et" que si ce qui
// suit ressemble à un code de série (évite de tronquer "DEAT/Peche et aquaculture")
export function parse(serieBacText) {
  const sansParens = raw.replace(/\([^)]*\)/g, " ");
  const normalise = sansParens.replace(/\s+et\s+/gi, (m, offset, full) => {
    const premierMot = full.slice(offset + m.length).split(/[\s,]+/).filter(Boolean)[0] || "";
    return estCodeSerie(premierMot) ? "," : m;        // coupe seulement si code de série suit
  });
  return { toutesSeries: false, tokens: normalise.split(",").map(t => t.trim()).filter(Boolean) };
}
```

**Cas tests imposés :**

| Entrée `serie_bac` | `matchSerie("D", …)` | Raison |
|---|---|---|
| `"C, D"` | `true` | token "D" présent |
| `"A1, A2, B, C, D, DEAT (toutes specialites) et DT/STI"` | `true` | "D" isolé |
| `"DEAT (toutes specialites) et DT/STI"` | **`false`** | pas de token "D" isolé |
| `"Toutes series confondues"` | `true` | wildcard |

---

## 2. Résolution des matières conditionnelles

**Fichier :** `public/js/lib/matiereResolver.js`

`criteres_classement.matiere` encode des variantes selon la série sous plusieurs formats :

| Format | Exemple réel | Résolution |
|---|---|---|
| 1 — `BASE (ALT pour GROUPE)` | `"PCT (LV1 pour A et Economie pour B)"` | Série A → "LV1", B → "Economie", autres → "PCT" |
| 2 — `BASE1/BASE2 (GROUPE)` | `"Hist-Geo/Anglais (DT/STI)"` | DT/STI → "Anglais", autres → "Hist-Geo" |
| 3 — `BASE ou ALTERNATIVE (GROUPE)` | `"Maths ou Etude de Cas (G)"` | Séries G → "Etude de Cas", autres → "Maths" |
| 4 — `V1 (G1) / V2 (G2)` | `"Economie (B) / Maths (C-D) / Etude de Cas (G)"` | dispatché par groupe |

**Règle de sécurité :** si aucun format reconnu, le libellé brut est conservé et un `console.warn` est émis. Mieux vaut un champ verbeux qu'une résolution silencieusement fausse.

```js
export function resoudreMatiere(libelleBrut, serieUtilisateur) {
  if (!brut.includes("(")) return brut;               // simple -> retour direct

  const nbGroupes = (brut.match(/\(([^()]*)\)/g) || []).length;
  if (nbGroupes >= 2) return resoudreFormat4(brut, serie) ?? brutEtLog(brut);

  // Format 1 : "BASE (ALT pour GROUPE)"
  if (/\spour\s/i.test(dedans)) {
    const clauses = dedans.split(/\s+et\s+(?=\S+\s+pour\s+)/i);
    for (const clause of clauses) {
      const m = clause.match(/^(.*?)\s+pour\s+(.+)$/i);
      if (serieDansGroupe(serieUtilisateur, m[2])) return m[1];
    }
    return base; // aucune clause applicable -> matière de base
  }
  // Format 2 : base contient "/"
  if (base.includes("/")) return serieDansGroupe(serie, dedans) ? base2 : base1;
  // Format 3 : "BASE ou ALTERNATIVE"
  if (/\sou\s/i.test(base)) return serieDansGroupe(serie, dedans) ? b2 : b1;
  // Qualificatif simple (ex. "Anglais (LV1)") -> on garde la base
  return base || brutEtLog(brut);
}
```

---

## 3. Calcul de la moyenne de classement officielle

**Fichier :** `public/js/engine/filtrage.js` + `public/js/lib/coefficients.js`

Formule officielle : **M = Σ(note × coef) / Σ(coef)** — Arrêté interministériel N°016-2003/MESRS.

### 3a. Table des coefficients

Source : Arrêté N°016-2003. Exemples (premier groupe uniquement — EPS et 2e groupe exclus) :

```
Série D : Maths=4, Sciences Physiques=4, SVT=5, Français=2, Anglais=2, Hist-Géo=2, Philo=2
Série C : Maths=6, Sciences Physiques=5, SVT=2, Français=2, Anglais=2, Hist-Géo=2, Philo=2
Série B : Economie=4, Hist-Géo=4, Français=4, Philo=3, LV1=2, Maths=2, SVT=2
(table complète pour A1/A2/B/C/D/E/F1..F4/G1..G3/EA dans coefficients.js)
```

Un **mapping** traduit les libellés du guide d'orientation (ex. `"PCT"`, `"Maths"`) vers les libellés de l'arrêté (ex. `"Sciences Physiques"`, `"Mathématiques"`).

### 3b. Statuts de la moyenne

```js
function calculerMoyenneClassement(matieres, notes, coefs, serie) {
  if (matieres.length === 0)   return { statut: "sansMatiere" };
  if (!notes || aucuneNote)    return { statut: "nonSaisi" };

  const manquantes = matieres.filter(m => !(m in notes) || notes[m] == null);
  if (manquantes.length > 0)  return { statut: "incomplete", manquantes };

  // Résolution coefficients : coef saisi par l'élève en priorité, sinon table officielle
  for (const m of matieres) {
    const coefVal = coefUser ?? trouverCoefficient(m, serie)?.coef ?? null;
    if (coefVal == null) return { statut: "coefInconnu", coefManquant: m };
    detail.push({ matiere: m, note: notes[m], coef: coefVal });
  }

  const sommeCoefs = detail.reduce((s, d) => s + d.coef, 0);
  const somme      = detail.reduce((s, d) => s + d.note * d.coef, 0);
  const valeur     = Math.round((somme / sommeCoefs) * 100) / 100;
  return { statut: "estimee", valeur, detail, sommeCoefs };
}
```

| Statut | Signification |
|---|---|
| `estimee` | Calcul OK — valeur disponible |
| `nonSaisi` | Aucune note saisie (mode "juste éligibilité") |
| `incomplete` | Certaines matières sans note |
| `coefInconnu` | Note présente mais coefficient absent de la table et non saisi → calcul bloqué |
| `sansMatiere` | Filière sans matière de sélection précisée |
| `concours` | Filière sur concours — épreuves spécifiques, pas de moyenne bac |

### 3c. Filières concours vs classement

```js
// MODE ENTREE issu de la base : "Classement", "Concours", ou NULL
if (estConcours(f)) {
  // AUCUNE moyenne : les lignes criteres_classement sont des épreuves de concours
  // (ex. "Culture générale"), pas des matières à moyenner
  moyenne = { statut: "concours", epreuves: matieres };
} else if (estClassement(f)) {
  moyenne = calculerMoyenneClassement(matieres, notes, coefs, serie);
} else {
  // mode_entree NULL : pas de formule
  moyenne = { statut: "nonClassement" };
}
```

---

## 4. Score composite (Couche 2)

**Fichier :** `public/js/engine/scoring.js`

Cinq composantes normalisées [0–1], combinées avec des pondérations chargées depuis `config_scoring` en base (jamais codées en dur).

### 4a. Pondérations (valeurs de référence v2 "réaliste terrain")

| Composante | Clé `config_scoring` | Poids défaut |
|---|---|---|
| Marge académique | `poids_marge_academique` | **0.35** |
| Affinité aspiration | `poids_affinite_reve` | **0.25** |
| Accessibilité financière | `poids_accessibilite_financiere` | **0.20** |
| Avenir du métier | `poids_avenir_metier` | **0.15** |
| Accessibilité géographique | `poids_accessibilite_geo` | **0.05** |

La table `config_scoring` peut modifier ces valeurs à la volée sans redéploiement.

### 4b. Calcul de chaque composante

```js
// score_marge_academique : moyenne estimée / 20
// Concours ou pas de notes → 0.5 (neutre, ne pénalise pas)
let sMarge = 0.5;
if (r.moyenne?.statut === "estimee") sMarge = Math.min(1, r.moyenne.valeur / 20);

// score_affinite_reve : similarité cosinus [0–1] si aspiration saisie, sinon 0.5 (neutre)
// Pénalité de rejet : si les débouchés matchent un terme rejeté → plafonné à 0.15
let sAffinite = similarite ?? 0.5;
if (rejetDetecte) sAffinite = 0.15;

// score_avenir_metier : 1 – (risque_IA_moyen / 100)
// Risque IA issu de O*NET/WEF par famille de métiers (score 0–100)
// 86% d'informalité au Bénin rend les données marché du travail locales non fiables
// → risque IA comme proxy faute de données d'insertion professionnelle locales
let sAvenir = 0.5;
if (r.risqueIAmoyen != null) sAvenir = Math.min(1, 1 - r.risqueIAmoyen / 100);

// score_accessibilite_financiere
// Places boursières (qB > 0) → 1.0 | payant seul (qP > 0) → 0.7 | inconnu → 0.3
let sFinancier = 0.3;
if (qB > 0) sFinancier = 1.0;
else if (qP > 0) sFinancier = 0.7;

// score_geo : TODO — ville élève non encore collectée → 0.5 neutre pour toutes
const sGeo = 0.5;

// Score final
const score = poids.marge_academique         * sMarge    +
              poids.affinite_reve            * sAffinite +
              poids.accessibilite_financiere * sFinancier +
              poids.avenir_metier            * sAvenir   +
              poids.accessibilite_geo        * sGeo;
// Garde-fou : jamais NaN, toujours [0–1]
```

### 4c. Détection de rejet

Si l'aspiration contient des négations explicites (`"je ne veux pas"`, `"sauf"`, etc.), Gemini les extrait sous forme de termes rejetés. Le scoring les compare aux débouchés de chaque filière par racine de mot (7 chars max) :

```js
function detecterRejet(rejette, metiersFiliere, debouches) {
  const texte = normaliserTexte(metiersNoms + " " + debouches);
  for (const terme of rejette) {
    const mots = normaliserTexte(terme).split(" ").filter(w => w.length >= 4);
    for (const mot of mots) {
      const racine = mot.slice(0, Math.min(7, mot.length));  // ex. "enseign" pour "enseignement"
      if (texte.includes(racine)) return true;
    }
  }
  return false;
}
// Seuil : 4 chars min (évite faux positifs sur mots courts), 7 chars max (couvre genre/nombre)
```

---

## 5. Matching sémantique (Couche 3 — optionnel)

**Frontend :** `public/js/data/semantique.js`
**Edge Function :** `supabase/functions/embed-match/index.ts`

L'embedding est calculé **côté serveur** (clé Gemini jamais exposée au navigateur). Fallback silencieux : si l'Edge Function est indisponible ou timeout (4 s), le tri existant (par score composite sans similarité) est conservé.

```
1. Frontend envoie : { aspiration: "je veux travailler en santé publique", eligibleIds: [...] }
2. Edge Function :
   a. Embed l'aspiration → vecteur 768 dims (Gemini text-embedding-004 / gemini-embedding-001)
   b. Appelle RPC pgvector `match_filieres` avec le vecteur + liste d'IDs éligibles
      (toujours RESTREINT aux filières éligibles en Couche 1 — jamais de reranking global)
   c. Retourne [{ filiere_id, similarite }] triés par cosinus décroissant
3. Frontend : similarite injectée dans calculerScoreComposite() comme composante sAffinite
```

```ts
// embed-match/index.ts — appel embedding
const vec = await embed(txt);   // gemini-embedding-001, 768 dims
await supabase.rpc("match_filieres", {
  query_embedding: "[" + vec.join(",") + "]",
  eligible: eligibleIds,        // CONTRAINTE : seulement les filières déjà éligibles
  k: 10,
});
```

**Point de vigilance :** le modèle d'embedding (`gemini-embedding-001`) DOIT être identique au modèle utilisé lors de la génération des embeddings stockés en base, sinon les vecteurs sont incomparables.

---

## 6. Chances d'admission

**Fichier :** `public/js/lib/seuilsAdmission.js`

Convertit la moyenne estimée en pourcentage indicatif et zone colorée. **Ce n'est PAS une probabilité officielle** — le seuil réel varie chaque année selon le nombre de candidats et de places.

### 6a. Seuils par niveau de demande (hardcodés)

| Niveau | Seuil indicatif | Exemples de filières |
|---|---|---|
| Très demandée | 14 | Médecine, Pharmacie, Droit, IA, Informatique IFRI, Génie EPAC |
| Demandée | 12 | Gestion, Économie, Banque, Génie hors EPAC, Informatique générale |
| Moyenne (défaut) | 11 | Filières UNA, Sciences, filières non classées |
| Peu demandée | 10 | Lettres, Philosophie, Langues étrangères (Allemand, Espagnol, Chinois) |

Le classement d'une filière se fait par matching sur `intitule` + `nom établissement` (regex sur mots-clés).

### 6b. Formule de conversion

```js
// pct = 50 + (moyenne_eleve - seuil) × 12   — clamped [5, 95]
function calculerPourcentage(moyenne, seuil) {
  return Math.round(Math.min(95, Math.max(5, 50 + (moyenne - seuil) * 12)));
}

// Zones
// ≥ 65% → "favorable" (vert)
// 35–64% → "limite"   (ambre)
// < 35%  → "difficile" (rouge)

// Ne s'applique QU'aux filières à classement avec une moyenne estimée.
// Filières concours → "applicable: false, raison: 'concours'"
```

**Interprétation de la pente :** chaque point de moyenne au-dessus du seuil ajoute +12 points de pourcentage. À 1 point au-dessus → 62% (limite haute) ; à 2 points → 74% (favorable).

---

## 7. Conditions de concours spéciales

**Fichier :** `public/js/lib/conditionsBac.js`

Gère les règles de seuil de **moyenne générale du bac** (saisie séparément par l'élève) pour les filières à concours, avec deux exceptions terrain :

```js
// INSPEI (Sciences et Techniques de l'Ingénieur, UNSTIM, Concours)
// → Seuil 12 BLOQUANT : zéro place payante, concours fermé si < 12
// → Identifié par double garde : mode_entree === "Concours" ET intitule exact
function estINSPEI(filiere) {
  return filiere.mode_entree === "Concours"
      && filiere.intitule === "Sciences et Techniques de l'Ingénieur";
}

// IMSP (Classes préparatoires MPSI et PCSI, UAC, stockée "Classement" en base)
// → Seuil 12 pour la BOURSE seulement ; payant toujours possible
function estIMSP(filiere) {
  return filiere.intitule === "Classes préparatoires MPSI et PCSI";
}
```

| Cas | moy < 12 | moy ≥ 12 | moy non saisie |
|---|---|---|---|
| **INSPEI** | `ineligible: true`, badge "Non éligible", opacité réduite | Aucun message | Avertissement préventif |
| **IMSP** | "Tu peux suivre en tant que payant" | "Tu remplis la condition bourse" | Aucun message |
| **Autres concours** | "Bourse requiert ≥12, payant possible" | Aucun message | "Concours exigent généralement ≥12" |

**Limitation connue :** la condition "mention AB" de l'INSPEI est documentée dans le guide officiel mais **n'est pas stockée** dans la colonne `criteres_classement` (la colonne `condition_speciale` n'existe pas en base). La condition « moyenne ≥ 12 » est encodée en dur dans ce module sur la base du guide 2024–2025.

---

## 8. Justifications IA (Couche 3 — non bloquante)

**Frontend :** `public/js/data/justifications.js`
**Edge Function :** `supabase/functions/generate-justification/index.ts`
**Modèle :** `gemini-2.5-flash-lite` | `temperature: 0.2` | `maxOutputTokens: 1024`

### 8a. Extraction aspiration (action = "extract")

Prompt envoyé à Gemini pour parser les termes voulus/rejetés depuis l'aspiration brute de l'élève :

```
Analyse cette phrase d'un bachelier béninois qui décrit son projet professionnel.
Extrais séparément ce qu'il VEUT faire et ce qu'il REJETTE explicitement.

Phrase : "[ASPIRATION_BRUTE]"

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après :
{ "veut": ["terme1", "terme2"], "rejette": ["terme1", "terme2"] }

Si rien n'est rejeté explicitement, "rejette" est une liste vide.
N'invente rien : n'ajoute dans "rejette" que ce qui est EXPLICITEMENT refusé dans la phrase
(négations : "je veux pas", "sauf", "à part", "pas de", "je ne veux pas"...).
```

### 8b. Génération des justifications (action = "justifier")

Prompt complet (construit dans `construirePrompt()`) :

```
Tu es un conseiller d'orientation universitaire au Bénin. Tu t'adresses directement à l'élève
(tutoiement).

Profil de l'élève :
- Série de bac : [SERIE]
- Aspiration exprimée : "[ASPIRATION]"          ← omis si non renseignée

Voici le top N filières retenues par l'algorithme (classées du meilleur au moins bon score) :

Filière 1 (rang #1 sur N, filiere_id: "...") :
- Intitulé : [INTITULE]
- Établissement : [ETAB], [VILLE]
- Décomposition du score :
  · Marge académique (35%) : X% → niveau [très bonne|bonne|correcte|limite]
  · Affinité avec l'aspiration (25%) : X%           ← omis si aspiration vide
  · Avenir du métier (15%) : X% → [très bon avenir|avenir correct|avenir incertain]
  · Accessibilité financière (5%) : [places boursières|places payantes|incertaine]
- Matières de sélection : [MAT1, MAT2, ...]         ← si notes saisies
- Moyenne estimée (non pondérée) : X.XX/20          ← si calculée
- Métiers débouchés : [Métier1 (risque IA faible) ; Métier2 (risque IA moyen)]
- Places (référence historique) : Xb boursières, Yp payantes

[... filières 2 à N ...]

Ta mission : pour CHAQUE filière (et SEULEMENT celles listées), rédige une justification de 2 à
3 phrases, en français, qui répond à la question : "Pourquoi CETTE filière et qu'est-ce qui la
distingue des autres proposées ?"

Consignes strictes :
- Utilise UNIQUEMENT les données fournies ci-dessus — n'invente aucun chiffre, aucun fait,
  aucun établissement.
- Ne mentionne JAMAIS une filière absente de la liste.
- Pour chaque filière, identifie et mets en avant CE QUI LA DIFFÉRENCIE dans le contexte du top
  (ex. meilleure marge académique, métiers moins exposés à l'IA, plus de places boursières, rang #1).
- Ne répète pas le score brut sous forme de pourcentage — reformule en langage naturel.
- Varie les formulations et les mots d'accroche entre les filières.
- [Si aspiration renseignée] : Si l'affinité d'une filière avec l'aspiration est élevée,
  mets-le en valeur de façon naturelle.
  [Si aspiration vide] : N'évoque PAS l'aspiration — concentre-toi sur la marge académique,
  les métiers et l'accessibilité.
- [Si rejette non vide] : L'élève REJETTE EXPLICITEMENT : [TERMES]. Si une filière a pour
  débouché principal quelque chose que l'élève rejette, NE PRÉTENDS PAS qu'elle correspond
  à son projet. Mets plutôt en avant ses autres atouts sans survendre une affinité absente.

Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, dans ce format exact :
{ "justifications": [{ "filiere_id": "...", "texte": "..." }] }
```

---

## 9. Schéma de données pertinent

Colonnes des tables impliquées dans le moteur (schéma réel Supabase, anon key lecture seule).

### `filieres`
```
id                      uuid PK
etablissement_id        uuid → etablissements.id
intitule                text       -- nom de la filière
sigle                   text
niveau                  text       -- "Licence", "Master", "DUT"...
duree_annees            integer
diplome_delivre         text
description             text
debouches               text       -- items séparés par "; "
quota_boursiers         integer    -- places boursières (données guide, peuvent varier)
quota_payant            integer    -- places payantes
quota_entierement_payant integer
mode_entree             text       -- "Classement" | "Concours" | NULL
source_page             integer    -- numéro de page dans le guide officiel
```

### `criteres_classement`
```
id          uuid PK
filiere_id  uuid → filieres.id
serie_bac   text   -- TEXTE LIBRE COMPOSITE ex. "C, D, E et F" (jamais normalisé)
matiere     text   -- TEXTE LIBRE, peut être conditionnel ex. "PCT (LV1 pour A)"
coefficient real   -- NULL PARTOUT dans la base actuelle (source officielle non publiée)
```

### `etablissements`
```
id            uuid PK
universite_id uuid → universites.id
nom           text
sigle         text
type          text
ville         text
source_page   integer
```

### `config_scoring`
```
cle    text  -- ex. "poids_marge_academique", "poids_affinite_reve"...
valeur text  -- float sérialisé ; overrides les valeurs par défaut dans queries.js
```

### `filieres_embeddings` (index pgvector)
```
filiere_id  uuid   → filieres.id
embedding   vector(768)   -- gemini-embedding-001 sur intitule + debouches
```
Index : `ivfflat (embedding vector_cosine_ops)` — RPC `match_filieres(query_embedding, eligible, k)`.

### Table des coefficients (codée en JS, source : Arrêté N°016-2003)

Pas de table Supabase — les coefficients par matière et par série sont embarqués dans `lib/coefficients.js`. La colonne `coefficient` de `criteres_classement` est NULL partout ; les coefficients officiels sont lus depuis ce module.

---

## 10. Points d'attention pour l'auditeur

1. **Matching de série :** la logique est robuste sur les données actuelles mais repose sur des heuristiques (`estCodeSerie`) pour distinguer "code série" vs "nom composé" dans les séparateurs `" et "`. Un nouveau libellé ambigu en base pourrait produire un token inattendu.

2. **Résolution des matières :** 4 formats parsés manuellement par regex. Un format non reconnu retombe silencieusement sur le libellé brut (avec `console.warn`). Aucun test automatisé couvert hors des cas documentés.

3. **Coefficients :** la table arrêté N°016-2003 est codée en JS (pas en base). Si un coefficient est absent du mapping, `calculerMoyenneClassement` retourne `statut: "coefInconnu"` et bloque l'estimation — choix conservateur correct mais potentiellement frustrant pour des séries techniques rares.

4. **Seuils d'admission :** les seuils (10/11/12/14) sont hardcodés sur la base d'observations empiriques, pas de données statistiques officielles d'admission. La formule linéaire (`50 + delta × 12`) est un proxy — une pente identique pour toutes les filières d'un même niveau est une simplification forte.

5. **Risque IA comme proxy "avenir métier" :** faute de données d'insertion professionnelle locales fiables au Bénin (86% d'informalité), le score WEF/O*NET est utilisé comme substitut. Ce score reflète le risque global d'automatisation, pas l'employabilité réelle au Bénin.

6. **Score géographique :** composante à 5% actuellement neutralisée (0.5 pour tous). La ville de l'élève n'est pas collectée dans le wizard.

7. **Conditions INSPEI/IMSP :** identifiées par correspondance exacte sur `intitule`. Un changement de libellé en base casserait silencieusement la règle (pas de test d'intégration sur ce point).

8. **Justifications IA :** le texte est généré avec `temperature: 0.2` (faible — reproductibilité élevée). Les contraintes d'honnêteté (ne pas inventer) sont dans le prompt, mais Gemini peut halluciner. Le texte est présenté dans un slot "Généré par IA · à partir de tes données uniquement" visible à l'utilisateur.
