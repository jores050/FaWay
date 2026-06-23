-- =============================================================================
-- Migration : flags est_prepa_ingenieur + regle_concours_speciale sur filieres
-- -----------------------------------------------------------------------------
-- Remplace la détection par intitulé exact dans conditionsBac.js par des flags
-- DB. Le code lit ces flags en priorité ; le fallback sur l'intitulé reste actif
-- pour la compatibilité pendant la transition.
--
-- est_prepa_ingenieur   : booléen — la filière est une classe préparatoire
--                          menant au cycle ingénieur (INSPEI ou IMSP).
-- regle_concours_speciale : enum texte pour les règles d'accès non standard :
--   'inspei_bloquant'       → moyenne bac < 12 = zéro accès (ni payant)
--   'imsp_payant_possible'  → moyenne bac < 12 = accès payant possible (bourse exclue)
--
-- Exécuter UNE SEULE FOIS. Corriger les cas particuliers via UPDATE direct sur l'id.
-- =============================================================================

SET search_path = public;

-- 1. Ajout des colonnes (idempotent)
ALTER TABLE public.filieres
  ADD COLUMN IF NOT EXISTS est_prepa_ingenieur boolean NOT NULL DEFAULT false;

ALTER TABLE public.filieres
  ADD COLUMN IF NOT EXISTS regle_concours_speciale text
  CHECK (regle_concours_speciale IN ('inspei_bloquant', 'imsp_payant_possible'));

-- 2. Taguer l'INSPEI (Sciences et Techniques de l'Ingénieur — UNSTIM, concours)
--    Critère : intitulé exact + mode_entree = 'Concours'
UPDATE public.filieres
SET
  est_prepa_ingenieur      = true,
  regle_concours_speciale  = 'inspei_bloquant'
WHERE
  intitule = 'Sciences et Techniques de l''Ingénieur'
  AND mode_entree = 'Concours';

-- 3. Taguer l'IMSP (Classes préparatoires MPSI et PCSI — UAC)
UPDATE public.filieres
SET
  est_prepa_ingenieur      = true,
  regle_concours_speciale  = 'imsp_payant_possible'
WHERE
  intitule = 'Classes préparatoires MPSI et PCSI';

-- Vérification :
-- SELECT id, intitule, est_prepa_ingenieur, regle_concours_speciale
-- FROM public.filieres
-- WHERE est_prepa_ingenieur = true OR regle_concours_speciale IS NOT NULL;
--
-- Doit retourner 2 lignes : INSPEI + IMSP.
-- Si 0 → les intitulés en base ont changé ; relancer :
-- SELECT intitule FROM public.filieres WHERE intitule ~* 'ingénieur|préparatoire|MPSI';
