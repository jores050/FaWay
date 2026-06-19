-- ============================================================================
-- Décomposition des matières conditionnelles en lignes atomiques (1 série -> 1 matière)
-- Généré le 2026-06-18. À RELIRE avant exécution.
-- DELETE des matières conditionnelles + INSERT des lignes atomiques (NOT EXISTS -> idempotent).
-- "LV pour X" (langue vivante 2) -> "Espagnol ou Allemand" (le "ou" = choix de langue, autorisé).
-- ============================================================================

-- 1) Suppression des lignes conditionnelles
delete from criteres_classement where filiere_id='cf642665-2c08-4e0f-81d7-8ec6072d05f7' and matiere='Économie (B) ou Maths (C-D) ou Étude de cas (G)';
delete from criteres_classement where filiere_id='03bb4a54-3bca-41e3-a48c-2fd02de06631' and matiere='Allemand (LV1)';
delete from criteres_classement where filiere_id='03bb4a54-3bca-41e3-a48c-2fd02de06631' and matiere='Anglais (LV2) ou Hist-Géo (B)';
delete from criteres_classement where filiere_id='0f242159-eaec-4978-bfe1-c9d81390ad30' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='42b04c23-6765-4043-8b69-2753fc28f184' and matiere='Espagnol (LV1)';
delete from criteres_classement where filiere_id='42b04c23-6765-4043-8b69-2753fc28f184' and matiere='Anglais (LV2) ou Hist-Géo (B)';
delete from criteres_classement where filiere_id='1ab0df23-4e8b-4911-a55c-cb86087ca417' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='d0284473-5d09-4475-aa8b-6a269878f9f7' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='795722c4-912a-4e95-a674-34787a3977a1' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='dbeb71bd-77dc-4ff8-9f18-6bee9943a0a1' and matiere='PCT ou Maths (pour A)';
delete from criteres_classement where filiere_id='f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4' and matiere='SVT (Mobilisation des ressources en eau pour EA)';
delete from criteres_classement where filiere_id='f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4' and matiere='PCT (LV1 pour A et Économie pour B)';
delete from criteres_classement where filiere_id='f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4' and matiere='Hist-Géo (Assainissement pour EA)';
delete from criteres_classement where filiere_id='3dd81d5a-c310-4584-ad46-cf307a1e1353' and matiere='Maths (LV1 pour A et Économie pour B)';
delete from criteres_classement where filiere_id='649122ac-8071-4a79-bfac-b416ab8e4b7d' and matiere='Hist-Géo (Mobilisation des ressources en eau pour EA)';
delete from criteres_classement where filiere_id='6880b19c-1297-4f57-8ae2-d41cfda41ef2' and matiere='Maths (LV1 pour A et Économie pour B)';
delete from criteres_classement where filiere_id='0ec092ce-9ed2-4a21-9b2b-08e2624103a8' and matiere='SVT (PE pour EA)';
delete from criteres_classement where filiere_id='af378612-d00d-40b7-958a-f5e8290c0cbc' and matiere='SVT (PE pour EA)';
delete from criteres_classement where filiere_id='ec434ae0-2df4-4fce-80e5-9ed4626fc581' and matiere='SVT (PE pour EA)';
delete from criteres_classement where filiere_id='d0284473-5d09-4475-aa8b-6a269878f9f7' and matiere='Philosophie ou Étude de cas (G)';
delete from criteres_classement where filiere_id='d948d8b1-c26b-41e4-acdb-bedd75b8cec0' and matiere='SVT (PE pour EA)';
delete from criteres_classement where filiere_id='e7b57e9e-5e64-4d42-a76c-531dd2f8b318' and matiere='Anglais (LV1 pour B)';
delete from criteres_classement where filiere_id='a079fba7-c9bb-4bf8-a5f0-3232a1e2b1e7' and matiere='Maths ou Étude de cas (G2)';
delete from criteres_classement where filiere_id='837e388f-0f16-4222-8f39-32ad028fa34d' and matiere='Anglais (LV1 pour A)';
delete from criteres_classement where filiere_id='23959fd6-8f37-4d7a-8205-f8a26d4681c8' and matiere='Anglais (LV1 pour A)';
delete from criteres_classement where filiere_id='bfdb1c7f-b1cc-4b78-99fe-fbc97a367fe5' and matiere='Hist-Géo (Anglais pour les G)';
delete from criteres_classement where filiere_id='373e7cb6-e726-41f5-bfe4-07af31f6d4e1' and matiere='Anglais (LV1 pour A et B)';
delete from criteres_classement where filiere_id='15d11e03-9dc8-4b07-be4c-4f9cdbc47d37' and matiere='Anglais (LV1 pour A et B)';
delete from criteres_classement where filiere_id='14c04c8a-1020-489b-92d7-cba2e07ba5be' and matiere='Français (A-B-C-D) ou Étude de cas (G)';
delete from criteres_classement where filiere_id='acdb0270-7b1d-408e-808a-c1818f786eb4' and matiere='Maths ou Étude de cas (G)';
delete from criteres_classement where filiere_id='6add6cdf-beb8-4983-88ee-2172aea373f0' and matiere='Maths ou Étude de cas (G)';
delete from criteres_classement where filiere_id='14c04c8a-1020-489b-92d7-cba2e07ba5be' and matiere='Hist-Géo (A-B-C-D) ou Français (G)';
delete from criteres_classement where filiere_id='73b14b39-f6d7-4531-a5ca-905769ddc07d' and matiere='Maths (C-D) ou Étude de cas (G2-G3)';
delete from criteres_classement where filiere_id='73b14b39-f6d7-4531-a5ca-905769ddc07d' and matiere='Économie (G2-G3) ou Hist-Géo (C-D)';
delete from criteres_classement where filiere_id='e589c77c-0be1-4151-b43a-7cca710ea11a' and matiere='Anglais (LV1 pour A et B)';
delete from criteres_classement where filiere_id='e589c77c-0be1-4151-b43a-7cca710ea11a' and matiere='Hist-Géo (A-C-D) ou Économie (B) ou Étude de cas (G)';
delete from criteres_classement where filiere_id='b9aa066b-3fb5-4e4f-bd10-a6b3205d0d34' and matiere='Anglais (LV1 pour A et B)';
delete from criteres_classement where filiere_id='b9aa066b-3fb5-4e4f-bd10-a6b3205d0d34' and matiere='Hist-Géo (A-C-D) ou Économie (pour B et G)';
delete from criteres_classement where filiere_id='f7c0ea13-30b6-446e-acfa-078a6e6b3031' and matiere='Anglais ou Étude de Fabrication (E)';
delete from criteres_classement where filiere_id='c35c8a54-c34b-46cf-9443-55cbb49fbd9e' and matiere='Anglais ou Étude de Fabrication (E)';
delete from criteres_classement where filiere_id='49251194-97a5-40e9-81c4-a0d4ba48aa5f' and matiere='Anglais ou Étude de Fabrication (E)';
delete from criteres_classement where filiere_id='7bb8c867-6b76-4b8c-8694-a8151e0be908' and matiere='Anglais ou Étude de Fabrication (E)';
delete from criteres_classement where filiere_id='eb408022-c6f8-4f19-9a74-32cb49d87f5d' and matiere='Anglais ou Étude de Fabrication (E)';
delete from criteres_classement where filiere_id='27a3276b-49a0-4224-8f5a-b8b17838e264' and matiere='Anglais ou Français (E et F)';
delete from criteres_classement where filiere_id='82856398-baf7-47c6-9cde-19c853eac5de' and matiere='Anglais ou Français (E et F)';
delete from criteres_classement where filiere_id='6180ec45-ecaa-4aa3-bf6c-cc5f60042ef2' and matiere='Anglais ou Français (E et F)';
delete from criteres_classement where filiere_id='e57884a9-d54f-4f16-bc78-ec413b29711a' and matiere='Anglais ou Français (E et F)';
delete from criteres_classement where filiere_id='bb929343-5614-4349-8706-bdd6642c09e6' and matiere='Anglais ou Français (E et F)';
delete from criteres_classement where filiere_id='a4197721-5c22-4ea7-815a-1a0592217a5a' and matiere='Anglais ou Français (E et F)';
delete from criteres_classement where filiere_id='d68322b5-018a-4d2a-b0d5-fbfda679c412' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='df64d18c-0f27-4d3a-8bbe-229a28ca38c5' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='a1f2de24-df27-49d7-aae9-8f4c1b89bd3e' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='1bf98c1c-0ddf-402d-bcfe-481858055daa' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='76e3f329-1457-4c37-87f2-045c3de3131c' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='76e3f329-1457-4c37-87f2-045c3de3131c' and matiere='Hist-Géo ou Étude de cas (G2)';
delete from criteres_classement where filiere_id='43e7bb20-381c-46e9-87cd-db834b016f1f' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='43e7bb20-381c-46e9-87cd-db834b016f1f' and matiere='Hist-Géo ou Étude de cas (G2)';
delete from criteres_classement where filiere_id='bf53f0be-9454-46b6-a16a-76845a4456ce' and matiere='Étude de cas (G) ou Maths (B)';
delete from criteres_classement where filiere_id='0ffd826f-a91f-4665-bcd3-1c2090a44a05' and matiere='Étude de cas (G) ou Maths (B)';
delete from criteres_classement where filiere_id='6b8d8a65-af6e-4836-ad1f-a5d0c83680bf' and matiere='SVT (D) / PCT (C)';
delete from criteres_classement where filiere_id='c4b123ff-6b6a-4f41-a24a-51f440170961' and matiere='SVT (D) / PCT (C)';
delete from criteres_classement where filiere_id='3fd72d61-dab3-4b9b-ae6f-7d98f2ff4522' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='7a1634f6-364d-40db-b838-0fa0e75e6b1d' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='bd937962-2757-41a7-ba57-643aa94fd7b9' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='5faeb7a0-7e11-4329-addf-925f7f1ec8de' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='ead1dea1-0ecd-4984-9909-ade91d673597' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='339ac1dd-ee0b-4c17-9081-b83b79800520' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='25f7729e-746b-4cce-b8b8-8bdc7e45c9a7' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='f195382a-7757-43ab-b7b4-a5ca9a10ac03' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='967053d0-686c-4d82-bdc1-677d6a80443d' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='cf642665-2c08-4e0f-81d7-8ec6072d05f7' and matiere='Anglais (LV pour B)';
delete from criteres_classement where filiere_id='84791a47-5fa4-4209-820f-8263d91304ee' and matiere='Hist-Géo ou Étude de cas (G)';
delete from criteres_classement where filiere_id='c2741fe3-e3fd-4c91-8ab7-137282694428' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='84791a47-5fa4-4209-820f-8263d91304ee' and matiere='Anglais (LV1 pour A et B)';
delete from criteres_classement where filiere_id='1e7f2a64-54ad-446b-88fb-4aec05c9c625' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='aad237af-ed51-428c-8d88-932b64e1cb59' and matiere='Hist-Géo ou Anglais (G)';
delete from criteres_classement where filiere_id='60fc60fe-47a9-4f59-8d97-94122ad553d9' and matiere='Hist-Géo ou Anglais (G)';
delete from criteres_classement where filiere_id='6bda7bc1-7436-4ce2-9483-2b1b7949fa45' and matiere='Hist-Géo ou Anglais (G)';
delete from criteres_classement where filiere_id='64c311e0-3e1c-495a-af7e-2f30c890447c' and matiere='Allemand (LV1)';
delete from criteres_classement where filiere_id='292696c3-b723-4a90-bf42-7db24a62f8ec' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='f17e05a0-9f06-4b7f-89a8-51f2bb823bea' and matiere='Espagnol (LV1)';
delete from criteres_classement where filiere_id='6136cb1a-1d31-477f-808d-fa3b548c703d' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='b4c48b02-a597-4b4e-8e72-9178760dae31' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='d69d773d-6921-4596-8782-79d5116c3373' and matiere='Hist-Géo ou Anglais (DT/STI)';
delete from criteres_classement where filiere_id='e815a55d-ad7f-4f93-a326-e027510bfdbe' and matiere='Hist-Géo ou Anglais (DT/STI)';
delete from criteres_classement where filiere_id='e6144e1b-ff65-4d37-b146-f8e80f4a3b1e' and matiere='Hist-Géo ou Maths (DT/STI)';
delete from criteres_classement where filiere_id='e6144e1b-ff65-4d37-b146-f8e80f4a3b1e' and matiere='Anglais (LV1)';
delete from criteres_classement where filiere_id='7f443e07-2eeb-4259-9a65-79483c4ae3ea' and matiere='Anglais ou Français (E, F et DT/BTP)';
delete from criteres_classement where filiere_id='23d3d386-1e83-438e-8804-f0f5fd12fc04' and matiere='Maths ou Étude de cas (G)';
delete from criteres_classement where filiere_id='76e9c62e-877e-4a25-b1a2-d52ed1920f55' and matiere='Maths ou Étude de cas (G)';
delete from criteres_classement where filiere_id='c74422dd-5b99-4793-be3c-9de71990a190' and matiere='Maths ou Étude de cas (G)';
delete from criteres_classement where filiere_id='e7b57e9e-5e64-4d42-a76c-531dd2f8b318' and matiere='Économie (B) ou Maths (C-D) ou Étude de cas (G)';
delete from criteres_classement where filiere_id='837e388f-0f16-4222-8f39-32ad028fa34d' and matiere='Philosophie (A) ou SVT (C, D)';
delete from criteres_classement where filiere_id='bfdb1c7f-b1cc-4b78-99fe-fbc97a367fe5' and matiere='Philosophie (Droit Admin et du Travail pour G1 ; Maths pour G2-G3)';
delete from criteres_classement where filiere_id='14c04c8a-1020-489b-92d7-cba2e07ba5be' and matiere='Philosophie (A-B-C-D) ou Économie (G)';
delete from criteres_classement where filiere_id='e2694d12-4ac6-4874-8f9d-43c2e557c060' and matiere='Économie (B) ou Hist-Géo (C-D) ou Étude de cas (G2 et G3)';
delete from criteres_classement where filiere_id='4deaba90-4850-4891-9522-85c5d9ac2445' and matiere='Économie (B) ou Hist-Géo (C-D) ou Étude de cas (G2 et G3)';
delete from criteres_classement where filiere_id='cd8208ce-a2ed-4bc9-aea3-3d6d5b7679cd' and matiere='Économie (B) ou Hist-Géo (C-D) ou Étude de cas (G2 et G3)';
delete from criteres_classement where filiere_id='f96c5c51-8060-4749-a994-076707c3bc5e' and matiere='Étude de cas (G) / Maths (C, D) / Économie (B) / Techn Compta et Mercatique (DT/COM)';
delete from criteres_classement where filiere_id='059a1c20-ca39-40e6-9821-ba438b0f17ee' and matiere='Étude de cas (G) / Maths (C, D) / Économie (B) / Techn Compta et Mercatique (DT/COM)';
delete from criteres_classement where filiere_id='aad237af-ed51-428c-8d88-932b64e1cb59' and matiere='Philosophie ou Étude de cas (G)';
delete from criteres_classement where filiere_id='60fc60fe-47a9-4f59-8d97-94122ad553d9' and matiere='Philosophie ou Étude de cas (G)';
delete from criteres_classement where filiere_id='6bda7bc1-7436-4ce2-9483-2b1b7949fa45' and matiere='Philosophie ou Étude de cas (G)';

-- 2) Insertion des lignes atomiques (idempotent)
insert into criteres_classement (filiere_id, serie_bac, matiere)
select v.fid::uuid, v.s, v.m from (values
  ('cf642665-2c08-4e0f-81d7-8ec6072d05f7', 'B', 'Économie'),
  ('cf642665-2c08-4e0f-81d7-8ec6072d05f7', 'C, D', 'Maths'),
  ('cf642665-2c08-4e0f-81d7-8ec6072d05f7', 'G2, G3', 'Étude de cas'),
  ('03bb4a54-3bca-41e3-a48c-2fd02de06631', 'A1, A2, B', 'Allemand'),
  ('03bb4a54-3bca-41e3-a48c-2fd02de06631', 'A1, A2', 'Anglais'),
  ('03bb4a54-3bca-41e3-a48c-2fd02de06631', 'B', 'Hist-Géo'),
  ('0f242159-eaec-4978-bfe1-c9d81390ad30', 'A1, A2, B, C, D', 'Anglais'),
  ('42b04c23-6765-4043-8b69-2753fc28f184', 'A1, A2, B', 'Espagnol'),
  ('42b04c23-6765-4043-8b69-2753fc28f184', 'A1, A2', 'Anglais'),
  ('42b04c23-6765-4043-8b69-2753fc28f184', 'B', 'Hist-Géo'),
  ('1ab0df23-4e8b-4911-a55c-cb86087ca417', 'A1, A2, B, C, D', 'Anglais'),
  ('d0284473-5d09-4475-aa8b-6a269878f9f7', 'A1, A2, B, C, D, G1, G3', 'Anglais'),
  ('795722c4-912a-4e95-a674-34787a3977a1', 'A1, A2, B, C, D', 'Anglais'),
  ('dbeb71bd-77dc-4ff8-9f18-6bee9943a0a1', 'A1, A2', 'Maths'),
  ('dbeb71bd-77dc-4ff8-9f18-6bee9943a0a1', 'B, C, D', 'PCT'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'A1, A2, B, C, D', 'SVT'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'EA', 'Mobilisation des ressources en eau'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'A1, A2', 'Anglais'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'B', 'Économie'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'C, D, EA', 'PCT'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('f4c9ef89-2d58-4b59-8af0-5a15b3d4d3d4', 'EA', 'Assainissement'),
  ('3dd81d5a-c310-4584-ad46-cf307a1e1353', 'A1, A2', 'Anglais'),
  ('3dd81d5a-c310-4584-ad46-cf307a1e1353', 'B', 'Économie'),
  ('3dd81d5a-c310-4584-ad46-cf307a1e1353', 'C, D', 'Maths'),
  ('649122ac-8071-4a79-bfac-b416ab8e4b7d', 'C, D', 'Hist-Géo'),
  ('649122ac-8071-4a79-bfac-b416ab8e4b7d', 'EA', 'Mobilisation des ressources en eau'),
  ('6880b19c-1297-4f57-8ae2-d41cfda41ef2', 'A1, A2', 'Anglais'),
  ('6880b19c-1297-4f57-8ae2-d41cfda41ef2', 'B', 'Économie'),
  ('6880b19c-1297-4f57-8ae2-d41cfda41ef2', 'C, D', 'Maths'),
  ('0ec092ce-9ed2-4a21-9b2b-08e2624103a8', 'C, D', 'SVT'),
  ('0ec092ce-9ed2-4a21-9b2b-08e2624103a8', 'EA', 'PE'),
  ('af378612-d00d-40b7-958a-f5e8290c0cbc', 'C, D', 'SVT'),
  ('af378612-d00d-40b7-958a-f5e8290c0cbc', 'EA', 'PE'),
  ('ec434ae0-2df4-4fce-80e5-9ed4626fc581', 'C, D', 'SVT'),
  ('ec434ae0-2df4-4fce-80e5-9ed4626fc581', 'EA', 'PE'),
  ('d0284473-5d09-4475-aa8b-6a269878f9f7', 'A1, A2, B, C, D', 'Philosophie'),
  ('d0284473-5d09-4475-aa8b-6a269878f9f7', 'G1, G3', 'Étude de cas'),
  ('d948d8b1-c26b-41e4-acdb-bedd75b8cec0', 'C, D', 'SVT'),
  ('d948d8b1-c26b-41e4-acdb-bedd75b8cec0', 'EA', 'PE'),
  ('e7b57e9e-5e64-4d42-a76c-531dd2f8b318', 'B, C, D, G2, G3', 'Anglais'),
  ('a079fba7-c9bb-4bf8-a5f0-3232a1e2b1e7', 'C, D', 'Maths'),
  ('a079fba7-c9bb-4bf8-a5f0-3232a1e2b1e7', 'G2', 'Étude de cas'),
  ('837e388f-0f16-4222-8f39-32ad028fa34d', 'A1, A2, C, D', 'Anglais'),
  ('23959fd6-8f37-4d7a-8205-f8a26d4681c8', 'A1, A2, B, C, D', 'Anglais'),
  ('bfdb1c7f-b1cc-4b78-99fe-fbc97a367fe5', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('bfdb1c7f-b1cc-4b78-99fe-fbc97a367fe5', 'G1, G2, G3', 'Anglais'),
  ('373e7cb6-e726-41f5-bfe4-07af31f6d4e1', 'A1, A2, B, C, D', 'Anglais'),
  ('15d11e03-9dc8-4b07-be4c-4f9cdbc47d37', 'A1, A2, B, C, D', 'Anglais'),
  ('14c04c8a-1020-489b-92d7-cba2e07ba5be', 'A1, A2, B, C, D', 'Français'),
  ('14c04c8a-1020-489b-92d7-cba2e07ba5be', 'G1, G2, G3', 'Étude de cas'),
  ('acdb0270-7b1d-408e-808a-c1818f786eb4', 'C, D', 'Maths'),
  ('acdb0270-7b1d-408e-808a-c1818f786eb4', 'G2, G3', 'Étude de cas'),
  ('6add6cdf-beb8-4983-88ee-2172aea373f0', 'C, D', 'Maths'),
  ('6add6cdf-beb8-4983-88ee-2172aea373f0', 'G2, G3', 'Étude de cas'),
  ('14c04c8a-1020-489b-92d7-cba2e07ba5be', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('14c04c8a-1020-489b-92d7-cba2e07ba5be', 'G1, G2, G3', 'Français'),
  ('73b14b39-f6d7-4531-a5ca-905769ddc07d', 'C, D', 'Maths'),
  ('73b14b39-f6d7-4531-a5ca-905769ddc07d', 'G2, G3', 'Étude de cas'),
  ('73b14b39-f6d7-4531-a5ca-905769ddc07d', 'C, D', 'Hist-Géo'),
  ('73b14b39-f6d7-4531-a5ca-905769ddc07d', 'G2, G3', 'Économie'),
  ('e589c77c-0be1-4151-b43a-7cca710ea11a', 'A1, A2, B, C, D, G1, G2, G3', 'Anglais'),
  ('e589c77c-0be1-4151-b43a-7cca710ea11a', 'A1, A2, C, D', 'Hist-Géo'),
  ('e589c77c-0be1-4151-b43a-7cca710ea11a', 'B', 'Économie'),
  ('e589c77c-0be1-4151-b43a-7cca710ea11a', 'G1, G2, G3', 'Étude de cas'),
  ('b9aa066b-3fb5-4e4f-bd10-a6b3205d0d34', 'A1, A2, B, C, D, G1, G2, G3', 'Anglais'),
  ('b9aa066b-3fb5-4e4f-bd10-a6b3205d0d34', 'A1, A2, C, D', 'Hist-Géo'),
  ('b9aa066b-3fb5-4e4f-bd10-a6b3205d0d34', 'B, G1, G2, G3', 'Économie'),
  ('f7c0ea13-30b6-446e-acfa-078a6e6b3031', 'C, D', 'Anglais'),
  ('f7c0ea13-30b6-446e-acfa-078a6e6b3031', 'E', 'Étude de Fabrication'),
  ('c35c8a54-c34b-46cf-9443-55cbb49fbd9e', 'C, D', 'Anglais'),
  ('c35c8a54-c34b-46cf-9443-55cbb49fbd9e', 'E', 'Étude de Fabrication'),
  ('49251194-97a5-40e9-81c4-a0d4ba48aa5f', 'C, D', 'Anglais'),
  ('49251194-97a5-40e9-81c4-a0d4ba48aa5f', 'E', 'Étude de Fabrication'),
  ('7bb8c867-6b76-4b8c-8694-a8151e0be908', 'C, D', 'Anglais'),
  ('7bb8c867-6b76-4b8c-8694-a8151e0be908', 'E', 'Étude de Fabrication'),
  ('eb408022-c6f8-4f19-9a74-32cb49d87f5d', 'C, D', 'Anglais'),
  ('eb408022-c6f8-4f19-9a74-32cb49d87f5d', 'E', 'Étude de Fabrication'),
  ('27a3276b-49a0-4224-8f5a-b8b17838e264', 'C, D', 'Anglais'),
  ('27a3276b-49a0-4224-8f5a-b8b17838e264', 'E, F2, F3', 'Français'),
  ('82856398-baf7-47c6-9cde-19c853eac5de', 'C, D', 'Anglais'),
  ('82856398-baf7-47c6-9cde-19c853eac5de', 'E, F1', 'Français'),
  ('6180ec45-ecaa-4aa3-bf6c-cc5f60042ef2', 'C, D', 'Anglais'),
  ('6180ec45-ecaa-4aa3-bf6c-cc5f60042ef2', 'E, F2', 'Français'),
  ('e57884a9-d54f-4f16-bc78-ec413b29711a', 'C, D', 'Anglais'),
  ('e57884a9-d54f-4f16-bc78-ec413b29711a', 'E', 'Français'),
  ('bb929343-5614-4349-8706-bdd6642c09e6', 'C, D', 'Anglais'),
  ('bb929343-5614-4349-8706-bdd6642c09e6', 'E, F2, F3', 'Français'),
  ('a4197721-5c22-4ea7-815a-1a0592217a5a', 'C, D', 'Anglais'),
  ('a4197721-5c22-4ea7-815a-1a0592217a5a', 'E, F', 'Français'),
  ('d68322b5-018a-4d2a-b0d5-fbfda679c412', 'A1, A2, B, C, D', 'Anglais'),
  ('df64d18c-0f27-4d3a-8bbe-229a28ca38c5', 'A1, A2, B, C, D', 'Anglais'),
  ('a1f2de24-df27-49d7-aae9-8f4c1b89bd3e', 'A1, A2, B, C, D', 'Anglais'),
  ('1bf98c1c-0ddf-402d-bcfe-481858055daa', 'A1, A2, B, C, D', 'Anglais'),
  ('76e3f329-1457-4c37-87f2-045c3de3131c', 'A1, A2, B, C, D, G2', 'Anglais'),
  ('76e3f329-1457-4c37-87f2-045c3de3131c', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('76e3f329-1457-4c37-87f2-045c3de3131c', 'G2', 'Étude de cas'),
  ('43e7bb20-381c-46e9-87cd-db834b016f1f', 'A1, A2, B, C, D, G2', 'Anglais'),
  ('43e7bb20-381c-46e9-87cd-db834b016f1f', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('43e7bb20-381c-46e9-87cd-db834b016f1f', 'G2', 'Étude de cas'),
  ('bf53f0be-9454-46b6-a16a-76845a4456ce', 'B', 'Maths'),
  ('bf53f0be-9454-46b6-a16a-76845a4456ce', 'G', 'Étude de cas'),
  ('0ffd826f-a91f-4665-bcd3-1c2090a44a05', 'B', 'Maths'),
  ('0ffd826f-a91f-4665-bcd3-1c2090a44a05', 'G', 'Étude de cas'),
  ('6b8d8a65-af6e-4836-ad1f-a5d0c83680bf', 'C', 'PCT'),
  ('6b8d8a65-af6e-4836-ad1f-a5d0c83680bf', 'D', 'SVT'),
  ('c4b123ff-6b6a-4f41-a24a-51f440170961', 'C', 'PCT'),
  ('c4b123ff-6b6a-4f41-a24a-51f440170961', 'D', 'SVT'),
  ('3fd72d61-dab3-4b9b-ae6f-7d98f2ff4522', 'B, C, D, G3', 'Anglais'),
  ('7a1634f6-364d-40db-b838-0fa0e75e6b1d', 'B, C, D, G2', 'Anglais'),
  ('bd937962-2757-41a7-ba57-643aa94fd7b9', 'A2, C, D, G2, G3, B, G1', 'Anglais'),
  ('5faeb7a0-7e11-4329-addf-925f7f1ec8de', 'C, D, G2, G3, B', 'Anglais'),
  ('ead1dea1-0ecd-4984-9909-ade91d673597', 'C, D, G2, G3, B', 'Anglais'),
  ('339ac1dd-ee0b-4c17-9081-b83b79800520', 'C, D, G2, G3, B', 'Anglais'),
  ('25f7729e-746b-4cce-b8b8-8bdc7e45c9a7', 'C, D, G2, G3, B', 'Anglais'),
  ('f195382a-7757-43ab-b7b4-a5ca9a10ac03', 'C, D, G2, G3, B', 'Anglais'),
  ('967053d0-686c-4d82-bdc1-677d6a80443d', 'C, D, G2, G3, B', 'Anglais'),
  ('cf642665-2c08-4e0f-81d7-8ec6072d05f7', 'B', 'Espagnol ou Allemand'),
  ('cf642665-2c08-4e0f-81d7-8ec6072d05f7', 'C, D, G2, G3', 'Anglais'),
  ('84791a47-5fa4-4209-820f-8263d91304ee', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('84791a47-5fa4-4209-820f-8263d91304ee', 'G1, G2, G3', 'Étude de cas'),
  ('c2741fe3-e3fd-4c91-8ab7-137282694428', 'C, D, G2, G3, B', 'Anglais'),
  ('84791a47-5fa4-4209-820f-8263d91304ee', 'A1, A2, B, C, D, G1, G2, G3', 'Anglais'),
  ('1e7f2a64-54ad-446b-88fb-4aec05c9c625', 'A1, A2, B, C, D', 'Anglais'),
  ('aad237af-ed51-428c-8d88-932b64e1cb59', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('aad237af-ed51-428c-8d88-932b64e1cb59', 'G1, G2, G3', 'Anglais'),
  ('60fc60fe-47a9-4f59-8d97-94122ad553d9', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('60fc60fe-47a9-4f59-8d97-94122ad553d9', 'G1, G2, G3', 'Anglais'),
  ('6bda7bc1-7436-4ce2-9483-2b1b7949fa45', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('6bda7bc1-7436-4ce2-9483-2b1b7949fa45', 'G1, G2, G3', 'Anglais'),
  ('64c311e0-3e1c-495a-af7e-2f30c890447c', 'A1, A2, B', 'Allemand'),
  ('292696c3-b723-4a90-bf42-7db24a62f8ec', 'A1, A2, B, C, D, DEAT', 'Anglais'),
  ('f17e05a0-9f06-4b7f-89a8-51f2bb823bea', 'A1, A2, B', 'Espagnol'),
  ('6136cb1a-1d31-477f-808d-fa3b548c703d', 'A1, A2, B, C, D, DEAT', 'Anglais'),
  ('b4c48b02-a597-4b4e-8e72-9178760dae31', 'A1, A2, B, C, D, DEAT', 'Anglais'),
  ('d69d773d-6921-4596-8782-79d5116c3373', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('d69d773d-6921-4596-8782-79d5116c3373', 'DT/STI', 'Anglais'),
  ('e815a55d-ad7f-4f93-a326-e027510bfdbe', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('e815a55d-ad7f-4f93-a326-e027510bfdbe', 'DT/STI', 'Anglais'),
  ('e6144e1b-ff65-4d37-b146-f8e80f4a3b1e', 'A1, A2, B, C, D', 'Hist-Géo'),
  ('e6144e1b-ff65-4d37-b146-f8e80f4a3b1e', 'DT/STI', 'Maths'),
  ('e6144e1b-ff65-4d37-b146-f8e80f4a3b1e', 'A1, A2, B, C, D, DT/STI', 'Anglais'),
  ('7f443e07-2eeb-4259-9a65-79483c4ae3ea', 'C, D', 'Anglais'),
  ('7f443e07-2eeb-4259-9a65-79483c4ae3ea', 'E, F4, DT/BTP', 'Français'),
  ('23d3d386-1e83-438e-8804-f0f5fd12fc04', 'C, D', 'Maths'),
  ('23d3d386-1e83-438e-8804-f0f5fd12fc04', 'G2, G3', 'Étude de cas'),
  ('76e9c62e-877e-4a25-b1a2-d52ed1920f55', 'C, D', 'Maths'),
  ('76e9c62e-877e-4a25-b1a2-d52ed1920f55', 'G2, G3', 'Étude de cas'),
  ('c74422dd-5b99-4793-be3c-9de71990a190', 'C, D', 'Maths'),
  ('c74422dd-5b99-4793-be3c-9de71990a190', 'G2, G3', 'Étude de cas'),
  ('e7b57e9e-5e64-4d42-a76c-531dd2f8b318', 'B', 'Économie'),
  ('e7b57e9e-5e64-4d42-a76c-531dd2f8b318', 'C, D', 'Maths'),
  ('e7b57e9e-5e64-4d42-a76c-531dd2f8b318', 'G2, G3', 'Étude de cas'),
  ('837e388f-0f16-4222-8f39-32ad028fa34d', 'A1, A2', 'Philosophie'),
  ('837e388f-0f16-4222-8f39-32ad028fa34d', 'C, D', 'SVT'),
  ('bfdb1c7f-b1cc-4b78-99fe-fbc97a367fe5', 'A1, A2, B, C, D', 'Philosophie'),
  ('bfdb1c7f-b1cc-4b78-99fe-fbc97a367fe5', 'G1, G2, G3', 'Droit Admin et du Travail'),
  ('14c04c8a-1020-489b-92d7-cba2e07ba5be', 'A1, A2, B, C, D', 'Philosophie'),
  ('14c04c8a-1020-489b-92d7-cba2e07ba5be', 'G1, G2, G3', 'Économie'),
  ('e2694d12-4ac6-4874-8f9d-43c2e557c060', 'B', 'Économie'),
  ('e2694d12-4ac6-4874-8f9d-43c2e557c060', 'C, D', 'Hist-Géo'),
  ('e2694d12-4ac6-4874-8f9d-43c2e557c060', 'G2, G3', 'Étude de cas'),
  ('4deaba90-4850-4891-9522-85c5d9ac2445', 'B', 'Économie'),
  ('4deaba90-4850-4891-9522-85c5d9ac2445', 'C, D', 'Hist-Géo'),
  ('4deaba90-4850-4891-9522-85c5d9ac2445', 'G2, G3', 'Étude de cas'),
  ('cd8208ce-a2ed-4bc9-aea3-3d6d5b7679cd', 'B', 'Économie'),
  ('cd8208ce-a2ed-4bc9-aea3-3d6d5b7679cd', 'C, D', 'Hist-Géo'),
  ('cd8208ce-a2ed-4bc9-aea3-3d6d5b7679cd', 'G2, G3', 'Étude de cas'),
  ('f96c5c51-8060-4749-a994-076707c3bc5e', 'B', 'Économie'),
  ('f96c5c51-8060-4749-a994-076707c3bc5e', 'G2, G3', 'Étude de cas'),
  ('f96c5c51-8060-4749-a994-076707c3bc5e', 'C, D', 'Maths'),
  ('f96c5c51-8060-4749-a994-076707c3bc5e', 'DT/CoM', 'Techn Compta et Mercatique'),
  ('059a1c20-ca39-40e6-9821-ba438b0f17ee', 'B', 'Économie'),
  ('059a1c20-ca39-40e6-9821-ba438b0f17ee', 'G2, G3', 'Étude de cas'),
  ('059a1c20-ca39-40e6-9821-ba438b0f17ee', 'C, D', 'Maths'),
  ('059a1c20-ca39-40e6-9821-ba438b0f17ee', 'DT/CoM', 'Techn Compta et Mercatique'),
  ('aad237af-ed51-428c-8d88-932b64e1cb59', 'A1, A2, B, C, D', 'Philosophie'),
  ('aad237af-ed51-428c-8d88-932b64e1cb59', 'G1, G2, G3', 'Étude de cas'),
  ('60fc60fe-47a9-4f59-8d97-94122ad553d9', 'A1, A2, B, C, D', 'Philosophie'),
  ('60fc60fe-47a9-4f59-8d97-94122ad553d9', 'G1, G2, G3', 'Étude de cas'),
  ('6bda7bc1-7436-4ce2-9483-2b1b7949fa45', 'A1, A2, B, C, D', 'Philosophie'),
  ('6bda7bc1-7436-4ce2-9483-2b1b7949fa45', 'G1, G2, G3', 'Étude de cas')
) as v(fid, s, m)
where not exists (
  select 1 from criteres_classement c
  where c.filiere_id = v.fid::uuid and c.serie_bac = v.s and c.matiere = v.m
);
