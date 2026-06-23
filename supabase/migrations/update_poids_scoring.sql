-- Migration v4 : score composite réduit à 2 critères.
--   affinite_reve    : 0.56  (aspiration — critère dominant)
--   marge_academique : 0.44  (adéquation académique avec seuil de suffisance)
--   avenir_metier    : 0     (retiré du score — reste affiché comme badge info)
--   financier + geo  : 0     (inchangé)
--   Total            : 1.0000

UPDATE config_scoring SET valeur = 0.44   WHERE cle = 'poids_marge_academique';
UPDATE config_scoring SET valeur = 0.56   WHERE cle = 'poids_affinite_reve';
UPDATE config_scoring SET valeur = 0.0    WHERE cle = 'poids_accessibilite_financiere';
UPDATE config_scoring SET valeur = 0.0    WHERE cle = 'poids_avenir_metier';
UPDATE config_scoring SET valeur = 0.0    WHERE cle = 'poids_accessibilite_geo';

-- La colonne valeur était NUMERIC(5,4) → max 9.9999, trop étroit pour stocker 13.
-- On l'élargit à NUMERIC(8,4) : permet des valeurs jusqu'à 9999.9999 (seuils, délais, etc.)
-- sans impacter les poids existants (toujours dans [0,1]).
ALTER TABLE config_scoring ALTER COLUMN valeur TYPE NUMERIC(8, 4);

-- Seuil de suffisance académique (score_marge_academique = 1.0 dès que moyenne >= seuil)
INSERT INTO config_scoring (cle, valeur)
VALUES ('seuil_suffisance_academique', 13)
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- Vérification
SELECT cle, valeur FROM config_scoring ORDER BY cle;
