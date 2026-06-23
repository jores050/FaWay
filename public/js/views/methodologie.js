// =============================================================================
// views/methodologie.js — Page Méthodologie (transparence, crédibilité B2B)
// =============================================================================

import { el, monter, encartAvertissement } from "../ui.js";

export function render(mount) {
  const section = (titre, ...contenu) =>
    el(
      "section",
      { class: "methodo-section" },
      el("h2", { class: "methodo-titre" }, titre),
      ...contenu
    );

  const p = (...nodes) => el("p", {}, ...nodes);
  const fort = (t) => el("strong", {}, t);

  monter(
    mount,
    el(
      "div",
      { class: "stack" },

      // En-tête
      el(
        "div",
        { class: "card stack" },
        el("h1", {}, "Comment ça fonctionne ?"),
        p(
          "Cette page explique honnêtement comment IAOrientation calcule ses recommandations, ",
          "quelles sont ses sources, et où s'arrêtent ses certitudes. ",
          "Lire cette page avant de prendre une décision importante, c'est la bonne approche."
        )
      ),

      // 1. Source des données
      section(
        "📋 Source des données de filières",
        p(
          "Les filières, critères de sélection, quotas et modes d'entrée présentés dans cet outil proviennent du ",
          fort("Guide d'Orientation officiel du Ministère de l'Enseignement Supérieur et de la Recherche Scientifique du Bénin"),
          ". Nous couvrons actuellement ",
          fort("207 filières"),
          " réparties dans ",
          fort("53 établissements"),
          " à travers 4 universités : l'Université d'Abomey-Calavi (UAC), l'Université Nationale d'Agriculture (UNA), l'Université de Parakou (UP), et l'UNSTIM."
        ),
        p({ class: "muted" },
          "Ces données correspondent à une édition spécifique du guide. Elles sont mises à jour manuellement — certaines informations peuvent ne pas refléter la situation de l'année en cours."
        )
      ),

      // 2. Moyenne de classement officielle
      section(
        "📐 Moyenne de classement officielle",
        p(
          "Pour savoir si tu es éligible à une filière, on compare ta série de bac aux critères officiels. ",
          "Pour les filières admettant sur dossier (mode Classement), IAOrientation calcule ta ",
          fort("vraie moyenne de classement"),
          " selon la formule confirmée page 8 du guide d'orientation du Ministère :"
        ),
        el(
          "div",
          { style: "background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:.6rem 1rem;font-family:monospace;font-size:.92rem;margin:.4rem 0" },
          "M = (m₁×x + m₂×y + m₃×z) / (x + y + z)"
        ),
        p(
          "m₁, m₂, m₃ = tes notes dans les matières de sélection · x, y, z = ",
          fort("coefficients officiels de ta série"),
          " (arrêté interministériel N°016-2003). L'app les connaît et les applique automatiquement. Tu saisis uniquement tes notes."
        ),
        p(
          fort("Exemples officiels (filière Médecine) : "),
          "Bac D → (SVT×5 + Maths×4 + PCT×4) ÷ 13 ; Bac C → (SVT×2 + Maths×6 + PCT×5) ÷ 13. ",
          "Le résultat diffère selon la série, car les coefficients changent — c'est précisément ce que cette formule capture."
        ),
        p({ class: "muted" },
          fort("Limite : "),
          "cette moyenne indique ton niveau sur les matières de sélection de la filière. ",
          "L'app ne connaît pas le seuil d'admission (la moyenne du dernier admis l'an dernier) — ce seuil dépend du nombre de candidats chaque année. ",
          "Pour les filières à concours, aucune moyenne n'est calculée (admission sur épreuves, pas sur dossier)."
        )
      ),

      // 3. Quotas et bourses
      section(
        "🎓 Quotas et places boursières",
        p(
          "Les quotas de boursiers et de places payantes affichés correspondent aux données du guide d'orientation de l'année de référence. ",
          "Le nombre réel de places disponibles ",
          fort("peut varier d'une année à l'autre"),
          " selon les décisions du Ministère."
        ),
        p(
          "Nous n'affirmons jamais qu'un candidat sera boursier. Ces chiffres sont ",
          fort("indicatifs et historiques"),
          ", pas une garantie."
        )
      ),

      // 4. Aspiration et matching sémantique
      section(
        "🔍 Matching par aspiration",
        p(
          "Quand tu nous dis ce que tu rêves de faire, notre outil compare le sens de ta phrase à la description de chaque filière en utilisant une technologie d'intelligence artificielle ",
          fort("(embeddings sémantiques)"),
          ". Cela nous permet de repérer des correspondances même si tu n'utilises pas exactement les mêmes mots que la description officielle de la filière."
        ),
        p({ class: "muted" },
          "Cette fonctionnalité est optionnelle : si tu ne remplis pas le champ aspiration, l'outil fonctionne entièrement sans IA externe."
        )
      ),

      // 5. Domaines et métiers
      section(
        "🏷️ Domaines et groupage des filières",
        p(
          "L'étape « Quel domaine t'intéresse ? » te permet de sélectionner jusqu'à 3 grands domaines (santé, ingénierie, agriculture, etc.). Les filières dont les métiers débouchés appartiennent à ces domaines sont alors mises en avant dans tes résultats."
        ),
        p(
          "Cette classification est construite à partir de ",
          fort("647 métiers débouchés"),
          " répartis dans 14 domaines via une analyse automatique par mots-clés sur les intitulés de métiers. ",
          "Elle couvre environ 85 % des métiers de manière fiable — quelques cas limites peuvent ne pas être parfaitement catégorisés."
        )
      ),

      // 6. Risque IA
      section(
        "🤖 Risque d'automatisation des métiers par l'IA",
        p(
          "Pour chaque métier débouché d'une filière, nous affichons une estimation du risque que ce métier soit affecté par l'automatisation et l'intelligence artificielle dans les 5 à 15 prochaines années."
        ),
        p(
          "Cette estimation est ",
          fort("qualitative"),
          " : elle est calculée par famille de métiers (par exemple « Enseignement », « Gestion et comptabilité », « Ingénierie »), en s'appuyant sur les tendances documentées par des études internationales reconnues ",
          "(World Economic Forum — Future of Jobs Report, base de données O*NET)."
        ),
        el(
          "p",
          { class: "muted" },
          "Ce n'est PAS une mesure scientifique précise pour le contexte béninois ni pour un métier individuel exact — c'est un signal indicatif pour t'aider à réfléchir, pas une prédiction certaine."
        )
      ),

      // 7. Score composite
      section(
        "📊 Le score de compatibilité",
        p(
          "Le pourcentage affiché pour chaque filière combine plusieurs facteurs :"
        ),
        el(
          "ul",
          { class: "list" },
          el("li", {}, fort("35 % — Adéquation académique : "), "ta moyenne estimée sur les matières de sélection de la filière, ramenée sur 20. Ce n'est pas une probabilité d'admission : le Ministère ne publie pas les seuils réels ni les coefficients, donc ce score reflète ton niveau sur les matières concernées — pas tes chances exactes d'être classé parmi les admis."),
          el("li", {}, fort("25 % — Aspiration : "), "correspondance avec ce que tu nous as dit vouloir faire (ou score neutre si tu ne l'as pas renseignée)."),
          el("li", {}, fort("20 % — Accessibilité financière : "), "présence de places boursières dans la filière — accès réel à la formation."),
          el("li", {}, fort("15 % — Avenir du métier : "), "estimation de la résistance à l'automatisation des métiers associés (proxy IA, en attendant des données d'employabilité béninoises fiables)."),
          el("li", {}, fort("5 % — Accessibilité géographique : "), "facteur fixe dans cette version (à affiner quand la localisation de l'élève sera collectée).")
        ),
        p({ class: "muted" },
          "Ces pondérations peuvent évoluer pour améliorer la pertinence de l'outil. Le score est un repère de comparaison — pas un verdict définitif sur ta réussite dans une filière."
        )
      ),

      // 7b. Chances d'admission estimées
      section(
        "🎯 Chances d'admission estimées",
        p(
          "En plus du score de compatibilité, IAOrientation affiche une ",
          fort("estimation des chances d'admission"),
          " pour les filières admettant au classement (lorsque tu as saisi tes notes). Ces deux indicateurs mesurent des choses différentes :"
        ),
        el(
          "ul",
          { class: "list" },
          el("li", {}, fort("Score de compatibilité (Compat. X%) : "), "mesure à quel point la filière correspond à TON PROFIL (notes, aspiration, finances, avenir des métiers). Sert au classement des résultats."),
          el("li", {}, fort("Chances d'admission estimées (Y%) : "), "mesure si tu as le NIVEAU pour entrer dans la filière. Ne sert pas au classement — c'est une information séparée.")
        ),
        p(
          "La formule compare ta moyenne de classement au ",
          fort("seuil indicatif"),
          " de la filière (le niveau habituel des admis, estimé selon la demande de la filière) :"
        ),
        el(
          "div",
          { style: "background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:.6rem 1rem;font-family:monospace;font-size:.88rem;margin:.4rem 0" },
          "Si m ≥ seuil : pct = 50 + (m − seuil) × 12  [plafonné à 95]",
          el("br"),
          "Si m < seuil : pct = 50 − (seuil − m) × 12  [plancher à 5]"
        ),
        p(
          "Zones : ≥ 65% → favorable · 35–64% → limite · < 35% → difficile. ",
          "À la moyenne exacte du seuil, le résultat est 50% (« ça se joue »)."
        ),
        p({ class: "muted" },
          fort("Limite importante : "),
          "ce pourcentage n'est PAS une probabilité officielle. Le seuil réel d'admission varie chaque année selon le nombre de candidats et les places disponibles — données que l'app ne possède pas à l'avance. ",
          "Les seuils indicatifs utilisés sont estimés selon la réputation et la demande habituelle de chaque filière. Pour les filières à concours, aucun pourcentage n'est affiché (le bac ne détermine pas l'admission)."
        )
      ),

      // 8. Justifications IA générées
      section(
        "✍️ Justifications personnalisées générées par IA",
        p(
          "Pour les filières les mieux classées dans tes résultats, notre outil génère une explication courte (2-3 phrases) qui détaille pourquoi cette filière correspond à ton profil."
        ),
        p(
          "Ces explications sont rédigées par une intelligence artificielle ",
          fort("(Gemini 2.5 Flash Lite de Google)"),
          ", à partir uniquement des données déjà calculées par notre outil : ton score de compatibilité, tes matières et ta moyenne estimée, les métiers débouchés et leur niveau de risque IA, les quotas de places."
        ),
        p(
          fort("L'IA ne sélectionne jamais les filières"),
          " — elle se contente de formuler en langage naturel les résultats déjà déterminés par nos calculs. Un seul appel API est effectué par session utilisateur, uniquement pour les 5 meilleures filières. Si cet appel échoue, les résultats s'affichent normalement, sans texte généré."
        )
      ),

      // 8. Disclaimer final (visuellement distinct)
      encartAvertissement(
        el("p", { style: "margin:0 0 .4rem;font-weight:700" }, "Cet outil est une aide à la décision, pas un substitut à un conseiller d'orientation."),
        el(
          "p",
          { style: "margin:0" },
          "Pour toute décision importante concernant ton avenir, nous t'encourageons à échanger avec un conseiller d'orientation, tes enseignants, ou ta famille. ",
          "La plateforme officielle d'inscription du Ministère de l'Enseignement Supérieur reste la référence absolue pour les critères d'admission réels."
        )
      ),

      // Retour accueil
      el(
        "div",
        { class: "actions" },
        el("a", { class: "btn btn--ghost", href: "#/" }, "← Retour à l'accueil")
      )
    )
  );
}
