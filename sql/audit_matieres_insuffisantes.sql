-- =============================================================================
-- audit_matieres_insuffisantes.sql
-- Filières Classement ayant < 3 matières pour au moins une de leurs séries.
-- On exclut Concours (épreuves != matières) et NULL mode_entree.
-- =============================================================================

-- ① Vue des couples (filière, série token, nb matières) pour Classement
WITH tokens AS (
  -- Éclate serie_bac en tokens individuels (approximation SQL via split_part)
  -- On utilise regexp_split_to_table pour gérer virgules, "et", espaces
  SELECT
    f.id           AS filiere_id,
    f.intitule     AS filiere,
    f.mode_entree,
    cc.matiere,
    -- Normalise le champ serie_bac en tokens séparés par virgule
    TRIM(tok.token) AS serie_token
  FROM filieres f
  JOIN criteres_classement cc ON cc.filiere_id = f.id
  -- Éclate sur virgule ou " et " (approximation)
  CROSS JOIN LATERAL regexp_split_to_table(cc.serie_bac, '\s*,\s*|\s+et\s+') AS tok(token)
  WHERE f.mode_entree = 'Classement'
    AND cc.matiere IS NOT NULL
    AND TRIM(tok.token) <> ''
    -- Exclure les qualificatifs entre parenthèses qui ne sont pas des codes série
    AND TRIM(tok.token) NOT LIKE '(%'
),
-- Retire les qualificatifs parasites (ex. "(toutes specialites)")
tokens_clean AS (
  SELECT
    filiere_id,
    filiere,
    matiere,
    -- Supprime les parenthèses et leur contenu du token
    TRIM(regexp_replace(serie_token, '\s*\(.*?\)\s*', '', 'g')) AS serie
  FROM tokens
  WHERE serie_token NOT LIKE '(%)'
),
-- Compte les matières distinctes par (filière, série)
comptes AS (
  SELECT
    filiere_id,
    filiere,
    serie,
    COUNT(DISTINCT LOWER(TRIM(matiere))) AS nb_matieres,
    STRING_AGG(DISTINCT matiere, ', ' ORDER BY matiere) AS matieres
  FROM tokens_clean
  WHERE serie <> ''
  GROUP BY filiere_id, filiere, serie
)
-- ② Résultats : filières Classement avec < 3 matières pour une série
SELECT
  filiere,
  serie,
  nb_matieres,
  matieres
FROM comptes
WHERE nb_matieres < 3
ORDER BY filiere, serie;

-- ③ Résumé par filière
WITH tokens AS (
  SELECT
    f.id           AS filiere_id,
    f.intitule     AS filiere,
    cc.matiere,
    TRIM(tok.token) AS serie_token
  FROM filieres f
  JOIN criteres_classement cc ON cc.filiere_id = f.id
  CROSS JOIN LATERAL regexp_split_to_table(cc.serie_bac, '\s*,\s*|\s+et\s+') AS tok(token)
  WHERE f.mode_entree = 'Classement'
    AND cc.matiere IS NOT NULL
    AND TRIM(tok.token) <> ''
    AND TRIM(tok.token) NOT LIKE '(%'
),
tokens_clean AS (
  SELECT filiere_id, filiere, matiere,
    TRIM(regexp_replace(serie_token, '\s*\(.*?\)\s*', '', 'g')) AS serie
  FROM tokens WHERE serie_token NOT LIKE '(%)'
),
comptes AS (
  SELECT filiere_id, filiere, serie,
    COUNT(DISTINCT LOWER(TRIM(matiere))) AS nb_matieres
  FROM tokens_clean WHERE serie <> ''
  GROUP BY filiere_id, filiere, serie
)
SELECT
  filiere,
  COUNT(*) AS nb_series_incompletes,
  MIN(nb_matieres) AS min_matieres,
  MAX(nb_matieres) AS max_matieres
FROM comptes
WHERE nb_matieres < 3
GROUP BY filiere
ORDER BY nb_series_incompletes DESC, filiere;
