// =============================================================================
// data/partage.js — Image de partage social "Mon top filières" (Canvas API)
// -----------------------------------------------------------------------------
// Génère une image PNG 1080×1080 côté client, sans appel réseau.
// Partage via navigator.share() sur mobile (WhatsApp, Instagram…) ou
// téléchargement direct en fallback desktop.
//
// Données incluses : série + top 3 filières (intitulé, étab, score en %).
// Aucune donnée personnelle identifiable (pas de nom, pas de notes brutes).
// =============================================================================

const W = 1080;
const H = 1080;
const PAD = 60;

// Mets à jour avec le domaine définitif du projet.
const DOMAIN = "iaorientation.vercel.app";

const C = {
  bleu:   "#0722AB",
  orange: "#F77E2D",
  fond:   "#F5F7FF",
  encre:  "#1a1a2e",
  blanc:  "#ffffff",
  muted:  "#6b7280",
};

// Or / Argent / Bronze pour les 3 rangs
const RANK_COLORS = ["#F77E2D", "#8b94a3", "#cd7f32"];

/** Dessine un rectangle à coins arrondis (prêt pour fill() ou stroke()). */
function rr(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = typeof r === "number" ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y,     x + w, y + tr,  tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y,         x + tl, y,      tl);
  ctx.closePath();
}

/** Tronque `text` pour tenir dans `maxW` pixels avec la fonte courante. */
function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

/**
 * Génère l'image de partage sous forme de Blob PNG.
 *
 * @param {object[]} topResultats  Tableau trié par score desc (max 3 utilisés)
 * @param {string}   serie         Série bac de l'élève
 * @returns {Promise<Blob>}
 */
export async function genererImagePartage(topResultats, serie) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const top3 = topResultats.slice(0, 3);

  // ── fond général ──────────────────────────────────────────────────────────
  ctx.fillStyle = C.fond;
  ctx.fillRect(0, 0, W, H);

  // ── bande header ─────────────────────────────────────────────────────────
  ctx.fillStyle = C.bleu;
  ctx.fillRect(0, 0, W, 200);

  ctx.textAlign = "center";
  ctx.font = "bold 84px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = C.blanc;
  ctx.fillText("IAOrientation", W / 2, 120);

  ctx.font = "40px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("Orientation universitaire · Bénin", W / 2, 174);

  // ── titre ─────────────────────────────────────────────────────────────────
  ctx.font = "bold 68px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = C.encre;
  ctx.fillText("Mon top filières", W / 2, 278);

  // ── badge série ───────────────────────────────────────────────────────────
  const serieLabel = "Série " + (serie || "?");
  ctx.font = "bold 44px system-ui,-apple-system,sans-serif";
  const bw = ctx.measureText(serieLabel).width + 68;
  const bx = (W - bw) / 2;
  ctx.fillStyle = C.bleu;
  rr(ctx, bx, 305, bw, 62, 31);
  ctx.fill();
  ctx.fillStyle = C.blanc;
  ctx.fillText(serieLabel, W / 2, 349);

  // ── séparateur orange ─────────────────────────────────────────────────────
  ctx.fillStyle = C.orange;
  ctx.fillRect(PAD, 385, W - PAD * 2, 5);

  // ── cartes filières ───────────────────────────────────────────────────────
  const CARD_H   = 162;
  const CARD_GAP = 18;
  const CARD_Y0  = 412;

  // Largeur disponible pour le texte central (après colonne rang et avant score)
  const RANK_COL_W  = 140; // espace réservé au numéro de rang
  const SCORE_COL_W = 115; // espace réservé au score à droite
  const TX    = PAD + RANK_COL_W;
  const TW    = W - PAD * 2 - RANK_COL_W - SCORE_COL_W;
  const TW_ET = TW + 60; // l'établissement peut mordre un peu sur la col score (moins large)

  top3.forEach((r, i) => {
    const f   = r.filiere;
    const etab = r.etablissement;
    const pct  = Math.round((r.scoreComposite ?? 0) * 100);
    const cy   = CARD_Y0 + i * (CARD_H + CARD_GAP);
    const rc   = RANK_COLORS[i];

    // fond blanc + ombre légère
    ctx.shadowColor    = "rgba(7,34,171,0.09)";
    ctx.shadowBlur     = 22;
    ctx.shadowOffsetY  = 5;
    ctx.fillStyle      = C.blanc;
    rr(ctx, PAD, cy, W - PAD * 2, CARD_H, 18);
    ctx.fill();
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    // barre latérale colorée (rang)
    ctx.fillStyle = rc;
    rr(ctx, PAD, cy, 10, CARD_H, [18, 0, 0, 18]);
    ctx.fill();

    // numéro de rang
    ctx.font      = "bold 90px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = rc;
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1), PAD + 24, cy + 118);

    // intitulé filière
    ctx.font      = "bold 44px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = C.encre;
    ctx.fillText(fit(ctx, f.intitule || "Filière", TW), TX, cy + 68);

    // établissement
    if (etab && etab.nom) {
      ctx.font      = "36px system-ui,-apple-system,sans-serif";
      ctx.fillStyle = C.muted;
      ctx.fillText(fit(ctx, etab.nom, TW_ET), TX, cy + 115);
    }

    // score (aligné à droite)
    ctx.font      = "bold 58px system-ui,-apple-system,sans-serif";
    ctx.fillStyle = rc;
    ctx.textAlign = "right";
    ctx.fillText(pct + "%", W - PAD - 6, cy + 99);
  });

  // ── footer CTA ───────────────────────────────────────────────────────────
  ctx.fillStyle = C.bleu;
  ctx.fillRect(0, H - 112, W, 112);

  ctx.textAlign = "center";
  ctx.font      = "38px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText("Découvre la tienne sur", W / 2, H - 60);

  ctx.font      = "bold 42px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = C.blanc;
  ctx.fillText(DOMAIN, W / 2, H - 18);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Partage le blob image via navigator.share() (mobile) ou
 * déclenche un téléchargement direct (fallback desktop).
 *
 * @param {Blob} blob
 */
export async function partagerResultats(blob) {
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
    const file = new File([blob], "mon-orientation.png", { type: "image/png" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Mon top filières",
          text: "Découvre mes filières recommandées sur IAOrientation !",
        });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // utilisateur a annulé → ne pas télécharger
        // Autre erreur (permission, etc.) → fallback téléchargement
      }
    }
  }
  // Fallback : lien téléchargement classique
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = "mon-orientation.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
