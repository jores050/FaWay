-- =============================================================================
-- audit_doublons_criteres.sql
-- Détecte les doublons (filiere_id, serie_bac, matiere) dans criteres_classement.
-- Un doublon = même triplet apparaît plus d'une fois.
-- =============================================================================

-- ① Liste des doublons exacts (même filière + même serie_bac + même matière)
SELECT
  f.intitule                                        AS filiere,
  cc.serie_bac,
  cc.matiere,
  COUNT(*)                                          AS occurrences
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
GROUP BY f.intitule, cc.serie_bac, cc.matiere
HAVING COUNT(*) > 1
ORDER BY f.intitule, cc.serie_bac, cc.matiere;

-- ② Résumé : nombre de filières touchées
SELECT COUNT(DISTINCT f.intitule) AS filieres_avec_doublons
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
GROUP BY f.intitule, cc.serie_bac, cc.matiere
HAVING COUNT(*) > 1;

-- ③ Bonus : filières où une même matière apparaît sous deux casses différentes
--    (ex. "Technologie de spécialité" vs "Technologie de Spécialité")
SELECT
  f.intitule                        AS filiere,
  cc.serie_bac,
  LOWER(TRIM(cc.matiere))           AS matiere_normalisee,
  COUNT(*)                          AS occurrences,
  STRING_AGG(cc.matiere, ' | ')     AS variantes_casse
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
GROUP BY f.intitule, cc.serie_bac, LOWER(TRIM(cc.matiere))
HAVING COUNT(*) > 1
ORDER BY f.intitule, cc.serie_bac;
