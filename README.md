# IAOrientation — Orientation des bacheliers (UAC, Bénin)

Application web qui aide les nouveaux bacheliers à trouver les **filières de l'Université
d'Abomey-Calavi (UAC)** accessibles selon leur **série de bac**, puis à les comparer selon leurs
notes et leur aspiration. Données issues du **Guide d'Orientation officiel** du Ministère de
l'Enseignement Supérieur, déjà stockées dans Supabase.

> **Honnêteté des données avant tout.** Le guide officiel ne publie **aucun coefficient chiffré** :
> l'app ne calcule donc **jamais** de « moyenne de classement officielle ». Elle propose au mieux une
> *estimation non pondérée*, toujours étiquetée comme telle. Les quotas affichés sont des **données
> de référence** (année du guide), jamais une garantie de statut boursier/payant.

## Stack

- **Frontend** : Vanilla JS (ES modules), HTML5, CSS3 — mobile-first, aucun framework.
- **Backend** : Supabase (Postgres), accès **direct depuis le navigateur** via le client
  `@supabase/supabase-js` (clé **anon**, lecture publique). Chargé via **CDN ESM** → pas de build.
- Pas d'Edge Function ni d'IA générative dans cette v1 (moteur 100 % JS/SQL).

## Configuration (obligatoire avant lancement)

1. Copier le modèle de config :
   ```bash
   cp public/js/config.example.js public/js/config.js
   ```
2. Éditer `public/js/config.js` et renseigner :
   - `SUPABASE_URL` — URL du projet Supabase ;
   - `SUPABASE_ANON_KEY` — clé **anon** (publique, lecture seule).

   `config.js` est **gitignoré** : aucune clé n'est committée. Ne jamais mettre la clé
   `service_role` côté frontend.

## Lancer en local

```bash
npm run serve     # sert public/ sur http://localhost:5173 (npx serve)
# ou, sans npm :
python -m http.server 5173 --directory public
```

Puis ouvrir http://localhost:5173 sur mobile (ou DevTools en mode responsive).

## Tests

```bash
npm test          # node test/serieParser.test.js
```

Le parsing des chaînes composites `serie_bac` (ex. `"A1, A2, B, C, D, DEAT (toutes specialites) et
DT/STI"`) est isolé dans [`public/js/lib/serieParser.js`](public/js/lib/serieParser.js) et couvert
par des tests sur les cas réels de la base — dont le cas critique « D » qui ne doit **pas** matcher
« DT » / « DEAT » / « DT/STI ».

## Structure

```
public/
  index.html              # shell + routeur par hash
  css/                    # base.css (tokens, layout) + components.css
  js/
    config.example.js     # modèle de config (config.js est gitignoré)
    lib/                   serieParser.js, supabaseClient.js
    data/queries.js        toutes les lectures Supabase + gestion d'erreur
    engine/filtrage.js     éligibilité + estimation non pondérée + tri
    store.js               état du wizard (autosave localStorage)
    router.js, ui.js
    views/                 landing, etape1_serie, etape2_notes, etape3_aspiration,
                           resultats, filiere
test/serieParser.test.js
```

## Garde-fous métier (ne jamais enfreindre)

- Jamais de coefficient ni de « moyenne pondérée officielle » (la donnée n'existe pas).
- Jamais d'autre université que celles réellement présentes en base (aujourd'hui : UAC seule).
- Jamais de garantie de statut boursier/payant — uniquement des quotas historiques de référence.
- Jamais de troncature/réinterprétation silencieuse d'un texte `serie_bac` ou `matiere`
  (les matières conditionnelles sont affichées **brutes**).
