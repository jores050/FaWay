-- ============================================================================
-- Normalisation des variantes — criteres_classement.serie_bac / .matiere
-- Généré le 2026-06-18. À RELIRE avant exécution.
-- UPDATE par ÉGALITÉ EXACTE (valeur complète pré-calculée) -> sûr et idempotent.
-- ⚠️ Lancer APRÈS le correctif d'artefacts (A / et / general / DT/Froid et Clim).
-- ============================================================================

-- ---------- SÉRIES (11) ----------
-- DT/Com  ->  DT/CoM
update criteres_classement set serie_bac = 'DT/CoM' where serie_bac = 'DT/Com';
-- DT/IMI, DWM  ->  DT/IMI, DT/DWM
update criteres_classement set serie_bac = 'DT/IMI, DT/DWM' where serie_bac = 'DT/IMI, DWM';
-- DT/EAP  ->  DT/EAp
update criteres_classement set serie_bac = 'DT/EAp' where serie_bac = 'DT/EAP';
-- C, D, E, F4, DT/Bâtiments et Travaux publics  ->  C, D, E, F4, DT/BTP
update criteres_classement set serie_bac = 'C, D, E, F4, DT/BTP' where serie_bac = 'C, D, E, F4, DT/Bâtiments et Travaux publics';
-- B, G2, G3, C, D, DT/COM  ->  B, G2, G3, C, D, DT/CoM
update criteres_classement set serie_bac = 'B, G2, G3, C, D, DT/CoM' where serie_bac = 'B, G2, G3, C, D, DT/COM';
-- F2, F3, DT/Electricité, DT/Electrotech  ->  F2, F3, DT/Electrotech
update criteres_classement set serie_bac = 'F2, F3, DT/Electrotech' where serie_bac = 'F2, F3, DT/Electricité, DT/Electrotech';
-- F2, F3, DT/Electricité  ->  F2, F3, DT/Electrotech
update criteres_classement set serie_bac = 'F2, F3, DT/Electrotech' where serie_bac = 'F2, F3, DT/Electricité';
-- DEAT/Pêche et aquaculture, DEAT/Production animale  ->  DEAT/Pêche et aquaculture, DEAT/PA
update criteres_classement set serie_bac = 'DEAT/Pêche et aquaculture, DEAT/PA' where serie_bac = 'DEAT/Pêche et aquaculture, DEAT/Production animale';
-- DEAT/Toutes les options  ->  DEAT
update criteres_classement set serie_bac = 'DEAT' where serie_bac = 'DEAT/Toutes les options';
-- DEAT/toutes options  ->  DEAT
update criteres_classement set serie_bac = 'DEAT' where serie_bac = 'DEAT/toutes options';
-- DT, CoM  ->  DT, DT/CoM
update criteres_classement set serie_bac = 'DT, DT/CoM' where serie_bac = 'DT, CoM';

-- ---------- MATIÈRES (21) ----------
-- Philo  ->  Philosophie
update criteres_classement set matiere = 'Philosophie' where matiere = 'Philo';
-- Philo ou Étude de cas (G)  ->  Philosophie ou Étude de cas (G)
update criteres_classement set matiere = 'Philosophie ou Étude de cas (G)' where matiere = 'Philo ou Étude de cas (G)';
-- Maths appliquées  ->  Mathématiques Appliquées
update criteres_classement set matiere = 'Mathématiques Appliquées' where matiere = 'Maths appliquées';
-- Maths ou Étude de Cas (G)  ->  Maths ou Étude de cas (G)
update criteres_classement set matiere = 'Maths ou Étude de cas (G)' where matiere = 'Maths ou Étude de Cas (G)';
-- Économie (B) ou Maths (C-D) ou Étude de Cas (G)  ->  Économie (B) ou Maths (C-D) ou Étude de cas (G)
update criteres_classement set matiere = 'Économie (B) ou Maths (C-D) ou Étude de cas (G)' where matiere = 'Économie (B) ou Maths (C-D) ou Étude de Cas (G)';
-- Philo (A) ou SVT (C, D)  ->  Philosophie (A) ou SVT (C, D)
update criteres_classement set matiere = 'Philosophie (A) ou SVT (C, D)' where matiere = 'Philo (A) ou SVT (C, D)';
-- Philo (Droit Admin et du Travail pour G1 ; Maths pour G2-G3)  ->  Philosophie (Droit Admin et du Travail pour G1 ; Maths pour G2-G3)
update criteres_classement set matiere = 'Philosophie (Droit Admin et du Travail pour G1 ; Maths pour G2-G3)' where matiere = 'Philo (Droit Admin et du Travail pour G1 ; Maths pour G2-G3)';
-- Philo (A-B-C-D) ou Économie (G)  ->  Philosophie (A-B-C-D) ou Économie (G)
update criteres_classement set matiere = 'Philosophie (A-B-C-D) ou Économie (G)' where matiere = 'Philo (A-B-C-D) ou Économie (G)';
-- Sciences appliquées  ->  Sciences Appliquées
update criteres_classement set matiere = 'Sciences Appliquées' where matiere = 'Sciences appliquées';
-- Économie (B) ou Hist-Géo (C-D) ou Étude de Cas (G2 et G3)  ->  Économie (B) ou Hist-Géo (C-D) ou Étude de cas (G2 et G3)
update criteres_classement set matiere = 'Économie (B) ou Hist-Géo (C-D) ou Étude de cas (G2 et G3)' where matiere = 'Économie (B) ou Hist-Géo (C-D) ou Étude de Cas (G2 et G3)';
-- Commentaire de texte en Philo  ->  Commentaire de texte en Philosophie
update criteres_classement set matiere = 'Commentaire de texte en Philosophie' where matiere = 'Commentaire de texte en Philo';
-- Etude de cas (G) / Maths (C, D) / Economie (B) / Techn Compta et Mercatique (DT/COM)  ->  Étude de cas (G) / Maths (C, D) / Économie (B) / Techn Compta et Mercatique (DT/COM)
update criteres_classement set matiere = 'Étude de cas (G) / Maths (C, D) / Économie (B) / Techn Compta et Mercatique (DT/COM)' where matiere = 'Etude de cas (G) / Maths (C, D) / Economie (B) / Techn Compta et Mercatique (DT/COM)';
-- Electrotech  ->  Electrotechnique
update criteres_classement set matiere = 'Electrotechnique' where matiere = 'Electrotech';
-- Economie  ->  Économie
update criteres_classement set matiere = 'Économie' where matiere = 'Economie';
-- Etude Electronique  ->  Étude Électronique
update criteres_classement set matiere = 'Étude Électronique' where matiere = 'Etude Electronique';
-- SPCT  ->  PCT
update criteres_classement set matiere = 'PCT' where matiere = 'SPCT';
-- Construction mécanique  ->  Construction Mécanique
update criteres_classement set matiere = 'Construction Mécanique' where matiere = 'Construction mécanique';
-- Etude de Cas  ->  Étude de cas
update criteres_classement set matiere = 'Étude de cas' where matiere = 'Etude de Cas';
-- Culture Générale  ->  Culture générale
update criteres_classement set matiere = 'Culture générale' where matiere = 'Culture Générale';
-- Philosophie ou Etude de cas (G)  ->  Philosophie ou Étude de cas (G)
update criteres_classement set matiere = 'Philosophie ou Étude de cas (G)' where matiere = 'Philosophie ou Etude de cas (G)';
-- Technologie de spécialité  ->  Technologie de Spécialité
update criteres_classement set matiere = 'Technologie de Spécialité' where matiere = 'Technologie de spécialité';
