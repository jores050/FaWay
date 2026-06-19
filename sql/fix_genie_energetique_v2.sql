-- =============================================================================
-- fix_genie_energetique_v2.sql
-- Nettoie les doublons, unifie DT/FC → DT/Froid et Clim,
-- et corrige DT/Electrotech (Maths×2 + PCT manquant).
-- Exécuter en une seule fois dans SQL Editor.
-- =============================================================================

DO $$
DECLARE
  fid uuid;
BEGIN
  -- Trouver la filière
  SELECT id INTO fid
  FROM filieres
  WHERE intitule ILIKE '%G_nie _nerg_tique%Froid%'
     OR intitule ILIKE '%Genie Energetique%Froid%'
  LIMIT 1;

  IF fid IS NULL THEN
    RAISE EXCEPTION 'Filière Génie Energétique (Froid et climatisation) introuvable';
  END IF;

  RAISE NOTICE 'Filière trouvée : %', fid;

  -- ① Supprimer TOUS les rows DT/FC et DT/Froid et Clim (doublons inclus)
  DELETE FROM criteres_classement
  WHERE filiere_id = fid
    AND serie_bac IN ('DT/FC', 'DT/Froid et Clim');

  -- ② Réinsérer 3 lignes propres sous DT/Froid et Clim (nom canonique)
  INSERT INTO criteres_classement (filiere_id, serie_bac, matiere) VALUES
    (fid, 'DT/Froid et Clim', 'Maths'),
    (fid, 'DT/Froid et Clim', 'Technique de Froid'),
    (fid, 'DT/Froid et Clim', 'Technologie de spécialité');

  -- ③ Supprimer TOUS les rows DT/Electrotech (Maths en double)
  DELETE FROM criteres_classement
  WHERE filiere_id = fid
    AND serie_bac = 'DT/Electrotech';

  -- ④ Réinsérer 3 lignes propres pour DT/Electrotech
  INSERT INTO criteres_classement (filiere_id, serie_bac, matiere) VALUES
    (fid, 'DT/Electrotech', 'Maths'),
    (fid, 'DT/Electrotech', 'Electrotechnique'),
    (fid, 'DT/Electrotech', 'PCT');

END $$;

-- =============================================================================
-- Vérification finale — attendu : exactement 3 matières par série DT
-- =============================================================================
SELECT
  cc.serie_bac,
  COUNT(*)                                          AS nb_matieres,
  STRING_AGG(cc.matiere, ', ' ORDER BY cc.matiere) AS matieres
FROM criteres_classement cc
JOIN filieres f ON f.id = cc.filiere_id
WHERE (f.intitule ILIKE '%G_nie _nerg_tique%Froid%'
    OR f.intitule ILIKE '%Genie Energetique%Froid%')
  AND cc.serie_bac LIKE 'DT%'
GROUP BY cc.serie_bac
ORDER BY cc.serie_bac;

-- Résultat attendu :
-- DT/EAp          → 3  (inchangé)
-- DT/Electrotech  → 3  (Electrotechnique, Maths, PCT)
-- DT/Froid et Clim→ 3  (Maths, Technique de Froid, Technologie de spécialité)
-- DT/FC           → (disparu — fusionné dans DT/Froid et Clim)
