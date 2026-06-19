-- =============================================================================
-- audit_matieres_v2.sql
-- Audit fiable en deux niveaux pour éviter les faux positifs dus au split " et "
-- sur les noms composites DEAT (ex. "DEAT/Pêche et aquaculture").
-- =============================================================================

-- =============================================================================
-- NIVEAU 1 : filières Classement avec < 3 matières DISTINCTES au total
-- Si une filière a < 3 matières distinctes dans toute sa table, c'est un vrai trou.
-- Ce test ne touche pas le split série → 0 faux positif.
-- =============================================================================
SELECT
  f.intitule                                              AS filiere,
  e.nom                                                   AS etablissement,
  COUNT(DISTINCT LOWER(TRIM(cc.matiere)))                 AS nb_matieres_distinctes,
  STRING_AGG(DISTINCT cc.matiere, ', ' ORDER BY cc.matiere) AS matieres_presentes
FROM filieres f
JOIN criteres_classement cc ON cc.filiere_id = f.id
LEFT JOIN etablissements e ON e.id = f.etablissement_id
WHERE f.mode_entree = 'Classement'
  AND cc.matiere IS NOT NULL
GROUP BY f.intitule, e.nom
HAVING COUNT(DISTINCT LOWER(TRIM(cc.matiere))) < 3
ORDER BY nb_matieres_distinctes, f.intitule;

-- =============================================================================
-- NIVEAU 2 : détail des séries concernées (pour les filières trouvées au N1)
-- À lancer après avoir identifié les filières au N1.
-- Remplace <NOM_FILIERE> par l'intitulé exact.
-- =============================================================================
-- SELECT cc.serie_bac, cc.matiere
-- FROM criteres_classement cc
-- JOIN filieres f ON f.id = cc.filiere_id
-- WHERE f.intitule = '<NOM_FILIERE>'
-- ORDER BY cc.serie_bac, cc.matiere;
