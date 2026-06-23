-- =============================================================================
-- Migration : niveau_demande sur la table filieres
-- -----------------------------------------------------------------------------
-- Remplace la classification regex dans seuilsAdmission.js par une valeur
-- stockée en base. Le code lit `filiere.niveau_demande` en priorité ; le regex
-- reste en fallback pour les filières non encore taguées.
--
-- Exécuter UNE SEULE FOIS (idempotent via IF NOT EXISTS + WHERE IS NULL).
-- Après exécution, corriger manuellement les cas douteux via UPDATE direct.
--
-- Seuils correspondants (définis dans SEUILS de seuilsAdmission.js) :
--   tres_demandee → 14
--   demandee      → 12
--   moyenne       → 11   ← défaut
--   peu_demandee  → 10
-- =============================================================================

SET search_path = public;

-- 1. Ajout de la colonne (idempotent)
ALTER TABLE public.filieres
  ADD COLUMN IF NOT EXISTS niveau_demande text
  CHECK (niveau_demande IN ('tres_demandee', 'demandee', 'moyenne', 'peu_demandee'));

-- 2. Pré-remplissage à partir des règles regex du moteur
-- L'ordre d'exécution reproduit exactement la priorité du code JS.

-- ── TRÈS DEMANDÉE (14) ───────────────────────────────────────────────────────
UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'médecine|pharmacie';

UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'kinésithérapie|kiné\y';

UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'sciences infirmières|sciences obstétrical';

UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'intelligence artificielle';

UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* '\ydroit\y';

-- Génie uniquement à l'EPAC
UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'génie'
  AND etablissement_id IN (
    SELECT id FROM public.etablissements WHERE sigle ~* 'epac'
  );

-- Informatique uniquement à l'IFRI
UPDATE public.filieres SET niveau_demande = 'tres_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'informatique'
  AND etablissement_id IN (
    SELECT id FROM public.etablissements WHERE sigle ~* 'ifri'
  );

-- ── DEMANDÉE (12) ────────────────────────────────────────────────────────────
UPDATE public.filieres SET niveau_demande = 'demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'gestion|économi|economie';

UPDATE public.filieres SET niveau_demande = 'demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'banque|finance|comptabilit|marketing|statistique';

-- Génie hors EPAC (EPAC déjà traité ci-dessus)
UPDATE public.filieres SET niveau_demande = 'demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'génie';

UPDATE public.filieres SET niveau_demande = 'demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'génie logiciel|logiciel|réseaux|cybersécurité|sécurité info';

-- Informatique hors IFRI
UPDATE public.filieres SET niveau_demande = 'demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'informatique';

-- ── PEU DEMANDÉE (10) ────────────────────────────────────────────────────────
UPDATE public.filieres SET niveau_demande = 'peu_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'lettres modernes|lettres classiques';

UPDATE public.filieres SET niveau_demande = 'peu_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* '\ballemand\b|\bespagnol\b|\bchinois';

UPDATE public.filieres SET niveau_demande = 'peu_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* '\bphilosophie\b';

UPDATE public.filieres SET niveau_demande = 'peu_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* 'langue arabe|arabe\b';

-- "Histoire" seule (pas "Histoire-Géographie")
UPDATE public.filieres SET niveau_demande = 'peu_demandee'
WHERE niveau_demande IS NULL
  AND intitule ~* '\bhistoire\b'
  AND intitule !~* 'géograph';

-- ── DÉFAUT : MOYENNE (11) ────────────────────────────────────────────────────
UPDATE public.filieres SET niveau_demande = 'moyenne'
WHERE niveau_demande IS NULL;

-- Vérification : toutes les filières doivent avoir une valeur
-- SELECT COUNT(*) FROM public.filieres WHERE niveau_demande IS NULL;  -- doit retourner 0

-- Pour voir la répartition :
-- SELECT niveau_demande, COUNT(*) FROM public.filieres GROUP BY niveau_demande ORDER BY 1;
