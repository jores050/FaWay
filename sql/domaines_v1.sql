-- ============================================================================
-- IAOrientation — Domaines métiers (v1)
-- ⚠️ CLASSIFICATION DE SECOURS par mots-clés sur intitulé du métier (~85% précision).
--    Générée automatiquement — à valider manuellement si le temps le permet.
-- Idempotent : ré-exécutable sans doublon.
-- À exécuter dans le SQL Editor Supabase (project lrgitzhrrgwcbswjcbbc).
-- ============================================================================

-- 1. Ajouter la colonne icone à la table domaines (déjà existante, vide)
ALTER TABLE domaines ADD COLUMN IF NOT EXISTS icone text;

-- 2. Ajouter domaine_id sur metiers (liaison métier → domaine)
ALTER TABLE metiers ADD COLUMN IF NOT EXISTS domaine_id uuid REFERENCES domaines(id);

-- 3. Seed 14 domaines (ON CONFLICT idempotent)
INSERT INTO domaines (nom, icone) VALUES
  ('Santé & action sociale',        'heart'),
  ('Éducation & formation',         'graduation-cap'),
  ('Informatique & numérique',      'monitor'),
  ('Ingénierie & technique',        'wrench'),
  ('Agriculture & environnement',   'leaf'),
  ('Sciences & recherche',          'book-open'),
  ('Commerce & marketing',          'shopping-bag'),
  ('Droit & administration',        'scale'),
  ('Arts, culture & communication', 'music'),
  ('BTP & génie civil',             'building-2'),
  ('Tourisme & hôtellerie',         'map-pin'),
  ('Finance & comptabilité',        'trending-up'),
  ('Énergie & industrie',           'zap'),
  ('Social & développement',        'users')
ON CONFLICT (nom) DO UPDATE SET icone = EXCLUDED.icone;

-- 4. Classification des 647 métiers par mots-clés
-- ⚠️ Chaque UPDATE ne touche que les lignes non encore classifiées (domaine_id IS NULL).
-- Ordre : du plus spécifique au plus général.

-- Informatique & numérique (avant Ingénierie pour éviter ambiguïtés sur "réseau")
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Informatique & numérique')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'développeur|informatique|logiciel|réseau informat|base de données|système d.information|données massives|données décision|numérique|cloud|big.data|administrateur de réseau|administrateur de base|technicien en réseau|technicien en maintenance informat|analystes des données|analystes et concepteurs|agence de développement|architectes logiciels|architecte des données|administrateurs de bases|analystes, statisticiens, comptable';

-- Santé & action sociale
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Santé & action sociale')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'santé|infirmi|médec|obstétr|pharmacie|soins|clinique|épidém|hygiène|sage-femme|sage femme|biomédical|agent de santé|laboratoire.*santé|surveillance épidém|action sanitaire|génie sanitaire|agent d.hygiène|attaché.*santé|planification.*santé|agent d.hygiène';

-- Agriculture & environnement
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Agriculture & environnement')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'agricol|agriculture|agronomi|environnement|écolog|forêt|forestier|pêche|aquaculture|élevage|ressources naturelles|reboisement|aménagement.*(ressources|protection)|agroalimentaire|agroindustriel|sylviculture|changement climatique|écohydro|hydrogéo|hydrologue|chimiste.*eaux|hydrologie|aménagement des pêches|hydraulique|génie rural|assainissement.*(agric|rural)|assistance.*coopérative.*agric|agent.*agricole|entreprise agricole|marché.*intrants|marchés.*intrants|production agricole|géomatique|sauvegarde environnement';

-- Éducation & formation
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Éducation & formation')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'enseignant|enseignement|éducation|formation|pédagog|didacticien|inspecteur.*(pédago|départe)|maître|lecteur correcteur|administrateur.*programmes.*éduc|maisons d.édition|consultant.*éducation|bi.plurilingue|interculturel|gestionnaire.*éducation|administrateur de programmes.*éduc|administrateur en programmes.*éduc';

-- Sciences & recherche
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Sciences & recherche')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'chercheur|laboratoires et institutions|chimiste|physicien|géologue|biologiste|géophysicien|astronome|mathématicien|accès.*master|accès.*école.*ingénieur|entrée.*grandes écoles|entrée.*masters|recherche$|^recherche';

-- Finance & comptabilité
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Finance & comptabilité')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'finance|comptable|comptabilit|audit|banque|assurance|fiscalit|agent de banque|contrôleur de gestion|agent comptable|trésor|budget|micro.finance|agent.*import-export';

-- Commerce & marketing
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Commerce & marketing')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'commerce|commercial|vente|marketing|import.export|acheteur|distribution|représentant commercial|gestionnaire commercial|approvisionnement|supply chain|logistique|négociant';

-- BTP & génie civil
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'BTP & génie civil')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'bâtiment|travaux publics|btp|génie civil|construction|architecture|urbanisme|topographe|géomètre|aménagement (urbain|des espaces urbains)|planification des espaces|cadastre|spécialiste en planification et gestion des espaces';

-- Tourisme & hôtellerie
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Tourisme & hôtellerie')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'tourisme|hôtellerie|restauration|voyage|guide touristique|hôtel|agence de voyage|agent dans le tourisme|loisir';

-- Énergie & industrie
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Énergie & industrie')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'énergie|électricité|électrotechnique|industriel|froid|climatisation|appareillage|instrumentation|mécanique (industrielle|des fluides)|production.*(industrielle|énergie)|raffinerie|pétrole|génie électrique|génie mécanique|génie industriel|électromécanique|automatisme|robotique';

-- Arts, culture & communication
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Arts, culture & communication')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'artiste|culture|médias|journaliste|communication|cinéma|designer|musique|scénario|comédien|dessinateur|peintre|sculpteur|illustrateur|maquettiste|doublage|voix off|manager d.artiste|créateur|monteur|scénographe|storyboard|compositeur|chanteur|musicien|chef de chœur|designer sonore|diffusion|production ou assistance|assistant programmateur|régisseur|agence de communication|relations publiques|attaché de presse|publiciste';

-- Droit & administration
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Droit & administration')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'droit|juridique|avocat|notaire|magistrat|administration publique|administration nationale|administration locale|administration communale|fonctionnaire|agents des services parlementaires|agents des services extérieurs|services diplomatiques|agent territorial|affaires juridiques|affaires publiques|agents des collectivités|services extérieurs|administration.*genre|administrations$|^administration$|ministères$|^ministères$';

-- Ingénierie & technique (catch-all pour ce qui reste technique)
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Ingénierie & technique')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'ingénieur|technicien|maintenance|mécanique|électrique|génie (de l|chimique|des proc|agro)|contrôleur.*(travaux|génie)|contrôle.*(qualité|travaux)|appareillage|instrumentation|analyse, contrôle';

-- Social & développement (catch-all large avant le catch-all final)
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Social & développement')
WHERE domaine_id IS NULL
  AND lower(nom) ~ 'social|développement|ong|humanitaire|projet de développement|coopération|action communautaire|travailleur social|sociologue|appui conseil|appui aux|administrateur de programmes|administrateur en programmes|programme.*développement|gouvernance|politiques publiques|politique de développement|études socioéconomiques|assistance.*gestion|assistance.*création|assistance dans les études|action.*communaut|assainissement$|^assainissement';

-- Catch-all final : tout métier non classifié → Social & développement
-- (les cas non couverts sont souvent des activités administratives ou génériques)
UPDATE metiers
SET domaine_id = (SELECT id FROM domaines WHERE nom = 'Social & développement')
WHERE domaine_id IS NULL;

-- 5. Rapport de classification (pour vérification)
SELECT d.nom, COUNT(m.id) AS nb_metiers
FROM domaines d
LEFT JOIN metiers m ON m.domaine_id = d.id
GROUP BY d.nom
ORDER BY nb_metiers DESC;

-- 6. RPC filieres_par_domaines
-- Retourne pour chaque filière éligible si elle a au moins un métier dans les domaines sélectionnés.
CREATE OR REPLACE FUNCTION filieres_par_domaines(
  eligible_ids uuid[],
  domaine_ids  uuid[]
)
RETURNS TABLE(filiere_id uuid, correspond_domaine boolean)
LANGUAGE sql STABLE
AS $$
  SELECT
    f.id AS filiere_id,
    EXISTS (
      SELECT 1
      FROM   filieres_metiers fm
      JOIN   metiers m ON m.id = fm.metier_id
      WHERE  fm.filiere_id = f.id
        AND  m.domaine_id = ANY(domaine_ids)
    ) AS correspond_domaine
  FROM filieres f
  WHERE f.id = ANY(eligible_ids)
$$;
