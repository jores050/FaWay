// =============================================================================
// router.js — Mini routeur par hash (aucune dépendance, ~40 lignes utiles)
// -----------------------------------------------------------------------------
// Format des URLs : "#/", "#/etape1", "#/etape2", "#/etape3", "#/resultats",
// "#/filiere/<id>". Le routeur extrait le nom de route + un éventuel paramètre.
// =============================================================================

/**
 * Analyse le hash courant -> { nom, params }.
 *   "#/"             -> { nom: "accueil", params: {} }
 *   "#/etape2"       -> { nom: "etape2",  params: {} }
 *   "#/filiere/ab12" -> { nom: "filiere", params: { id: "ab12" } }
 */
export function analyserHash(hash) {
  const brut = (hash || "").replace(/^#\/?/, ""); // retire "#/" ou "#"
  const segments = brut.split("/").filter(Boolean);
  const nom = segments[0] || "accueil";
  const params = {};
  if (segments[1]) params.id = decodeURIComponent(segments[1]);
  return { nom, params };
}

/** Navigue vers une route (déclenche le rendu via hashchange). */
export function naviguer(hash) {
  if (location.hash === hash) {
    // Même hash : forcer un re-rendu manuel.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = hash;
  }
}

/**
 * Démarre le routeur.
 * @param {Object} options
 * @param {HTMLElement} options.mount  Conteneur où monter les vues.
 * @param {Record<string, (mount: HTMLElement, params: object) => void|Promise<void>>} options.routes
 * @param {(mount: HTMLElement, erreur: Error) => void} options.onErreur
 * @param {string} [options.fallback="accueil"]
 */
export function demarrerRouteur({ mount, routes, onErreur, fallback = "accueil" }) {
  async function rendre() {
    const { nom, params } = analyserHash(location.hash);
    const vue = routes[nom] || routes[fallback];
    mount.innerHTML = "";
    try {
      await vue(mount, params);
    } catch (erreur) {
      console.error("[router] échec du rendu de la vue:", nom, erreur);
      if (onErreur) onErreur(mount, erreur);
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", rendre);
  rendre();
}
