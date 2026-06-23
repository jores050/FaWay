-- =============================================================================
-- audit_slash_sans_condition.sql
-- Trouve les matières contenant "/" mais SANS parenthèse conditionnelle.
-- Ce sont les cas qui s'affichent "bruts" à l'étape 2 (choix de langue encodé
-- en slash sans condition de série → le resolver les laisse passer).
-- =============================================================================

-- ① Toutes les matières brutes avec "/" mais sans "("
SELECT DISTINCT
  cc.matiere,
  COUNT(DISTINCT f.id)                                        AS nb_filieres,
  STRING_AGG(DISTINCT f.intitule, ', ' ORDER BY f.intitule)  AS filieres
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
WHERE cc.matiere LIKE '%/%'
  AND cc.matiere NOT LIKE '%(%'
GROUP BY cc.matiere
ORDER BY nb_filieres DESC, cc.matiere;

-- ② Filières concernées pour la série D spécifiquement
SELECT DISTINCT
  f.intitule  AS filiere,
  e.nom       AS etablissement,
  cc.serie_bac,
  cc.matiere
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
LEFT JOIN etablissements e ON e.id = f.etablissement_id
WHERE cc.matiere LIKE '%/%'
  AND cc.matiere NOT LIKE '%(%'
  AND cc.serie_bac LIKE '%D%'
ORDER BY f.intitule, cc.matiere;
