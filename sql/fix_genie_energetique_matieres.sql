-- =============================================================================
-- fix_genie_energetique_matieres.sql
-- Correctif : matières manquantes pour les séries DT dans
-- "Génie Energétique (Froid et climatisation)" [UNSTIM - INSTI]
--
-- Source : Guide d'orientation (données fournies par l'utilisateur) :
--   Maths                  → Toutes les filières autorisées
--   PCT                    → C, D, E, F3
--   Technique de Froid     → DT/FC
--   Anglais                → C, D
--   Technologie de spéc.   → DT/FC
--   Electrotechnique       → DT/Electrotech et F3
--   Construction mécanique → E
--
-- Gaps identifiés par le script _gaps.mjs :
--   DT/FC         : a {Maths, Technique de Froid}       → manque Technologie de spécialité
--   DT/Electrotech: a {Electrotechnique}                → manque Maths
--   DT/Froid et Clim: a {Technologie de Spécialité}    → manque Maths + Technique de Froid
--
-- Note : "DT/FC" et "DT/Froid et Clim" sont deux tokens distincts dans la DB
--   (données source hétérogènes). On complète les DEUX pour que chaque token
--   donne bien 3 matières.
-- =============================================================================

-- ① Vérification préalable : confirme l'ID et les critères actuels
SELECT
  f.id,
  f.intitule,
  cc.serie_bac,
  cc.matiere
FROM filieres f
JOIN criteres_classement cc ON cc.filiere_id = f.id
WHERE f.intitule ILIKE '%G%nie %nerg%tique%Froid%'
   OR f.intitule ILIKE '%Genie Energetique%Froid%'
   OR f.intitule ILIKE '%Génie Energétique%'
ORDER BY cc.serie_bac, cc.matiere;

-- =============================================================================
-- ② Insertions des matières manquantes (idempotent via WHERE NOT EXISTS)
-- =============================================================================

-- A. Technologie de spécialité pour DT/FC (3e matière manquante)
INSERT INTO criteres_classement (filiere_id, serie_bac, matiere)
SELECT f.id, 'DT/FC', 'Technologie de spécialité'
FROM filieres f
WHERE (f.intitule ILIKE '%G%nie %nerg%tique%Froid%' OR f.intitule ILIKE '%Génie Energétique%')
  AND NOT EXISTS (
    SELECT 1 FROM criteres_classement cc
    WHERE cc.filiere_id = f.id
      AND cc.serie_bac = 'DT/FC'
      AND cc.matiere ILIKE '%Technologie de sp%'
  );

-- B. Maths pour DT/Electrotech (manquant — le row Maths existant ne couvre pas ce token)
INSERT INTO criteres_classement (filiere_id, serie_bac, matiere)
SELECT f.id, 'DT/Electrotech', 'Maths'
FROM filieres f
WHERE (f.intitule ILIKE '%G%nie %nerg%tique%Froid%' OR f.intitule ILIKE '%Génie Energétique%')
  AND NOT EXISTS (
    SELECT 1 FROM criteres_classement cc
    WHERE cc.filiere_id = f.id
      AND cc.serie_bac = 'DT/Electrotech'
      AND cc.matiere = 'Maths'
  );

-- C. Maths pour DT/Froid et Clim
INSERT INTO criteres_classement (filiere_id, serie_bac, matiere)
SELECT f.id, 'DT/Froid et Clim', 'Maths'
FROM filieres f
WHERE (f.intitule ILIKE '%G%nie %nerg%tique%Froid%' OR f.intitule ILIKE '%Génie Energétique%')
  AND NOT EXISTS (
    SELECT 1 FROM criteres_classement cc
    WHERE cc.filiere_id = f.id
      AND cc.serie_bac = 'DT/Froid et Clim'
      AND cc.matiere = 'Maths'
  );

-- D. Technique de Froid pour DT/Froid et Clim
INSERT INTO criteres_classement (filiere_id, serie_bac, matiere)
SELECT f.id, 'DT/Froid et Clim', 'Technique de Froid'
FROM filieres f
WHERE (f.intitule ILIKE '%G%nie %nerg%tique%Froid%' OR f.intitule ILIKE '%Génie Energétique%')
  AND NOT EXISTS (
    SELECT 1 FROM criteres_classement cc
    WHERE cc.filiere_id = f.id
      AND cc.serie_bac = 'DT/Froid et Clim'
      AND cc.matiere ILIKE '%Technique de Froid%'
  );

-- =============================================================================
-- ③ Vérification post-insertion : chaque série DT doit avoir 3 matières
-- =============================================================================
SELECT
  cc.serie_bac,
  COUNT(*) AS nb_matieres,
  STRING_AGG(cc.matiere, ', ' ORDER BY cc.matiere) AS matieres
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
WHERE (f.intitule ILIKE '%G%nie %nerg%tique%Froid%' OR f.intitule ILIKE '%Génie Energétique%')
  AND cc.serie_bac LIKE 'DT%'
GROUP BY cc.serie_bac
ORDER BY cc.serie_bac;
-- Attendu :
--   DT/Electrotech  → 2 (Maths + Electrotechnique)
--   DT/FC           → 3 (Maths + Technique de Froid + Technologie de spécialité)
--   DT/Froid et Clim → 3 (Maths + Technique de Froid + Technologie de Spécialité)
