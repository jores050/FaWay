-- ============================================================================
-- IAOrientation — Corrections classification domaines (fix 1)
-- Bug 1 : "Recherche et analyse" → Sciences & recherche (faux positif keyword)
--         Utilisé uniquement par Langue Arabe + Culture Islamique → Arts, culture & communication
-- Bug 2 : Energies Renouvelables UNSTIM (ENSET) n'a qu'un métier "Professeur adjoint"
--         (Social & développement) — ajouter lien vers métier Énergie & industrie
-- ============================================================================

-- Fix 1 : Reclassifier "Recherche et analyse" (1f3da6b7) → Arts, culture & communication
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Arts, culture & communication')
WHERE id = '1f3da6b7-bb17-4db8-837a-cfb08b28dc83';

-- Vérification
SELECT nom, (SELECT nom FROM domaines WHERE id = domaine_id) AS domaine
FROM metiers WHERE id = '1f3da6b7-bb17-4db8-837a-cfb08b28dc83';

-- Fix 2 : Lier "Energies Renouvelables" UNSTIM (b72c2b2b) au métier
--         "Installations, équipements et systèmes pour énergies renouvelables" (8c965f62)
INSERT INTO filieres_metiers (filiere_id, metier_id)
VALUES (
  'b72c2b2b-2098-499c-8ace-332956e28ef4',
  '8c965f62-e572-4e55-baa0-52b6f81afb77'
)
ON CONFLICT DO NOTHING;

-- Vérification : métiers de la filière UNSTIM après fix
SELECT m.nom, (SELECT nom FROM domaines WHERE id = m.domaine_id) AS domaine
FROM filieres_metiers fm
JOIN metiers m ON m.id = fm.metier_id
WHERE fm.filiere_id = 'b72c2b2b-2098-499c-8ace-332956e28ef4';
