-- =============================================================================
-- config_scoring_v2.sql — Pondérations "logique réaliste terrain" (v2)
-- -----------------------------------------------------------------------------
-- Priorité : admission probable > aspiration > financement > avenir métier > géo
-- Le critère "résistance IA" devient "avenir du métier" (même calcul, nouveau nom).
-- INSERT … ON CONFLICT (cle) DO UPDATE pour idempotence.
-- =============================================================================

INSERT INTO config_scoring (cle, valeur) VALUES
  ('poids_marge_academique',         '0.35'),  -- ↑ 0.25 → 0.35 : admission probable prime
  ('poids_affinite_reve',            '0.25'),  -- ↓ 0.40 → 0.25 : rêve important mais pas dominant
  ('poids_accessibilite_financiere', '0.20'),  -- ↑ 0.05 → 0.20 : bourse = accès réel
  ('poids_avenir_metier',            '0.15'),  -- ↓ 0.20 → 0.15 (ex poids_resistance_ia)
  ('poids_accessibilite_geo',        '0.05')   -- ↓ 0.10 → 0.05 (fixe, peu différenciant)
ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur;

-- Supprimer l'ancienne clé si elle existe encore (rename resistance_ia → avenir_metier)
DELETE FROM config_scoring WHERE cle = 'poids_resistance_ia';
