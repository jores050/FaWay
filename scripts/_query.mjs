import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://lrgitzhrrgwcbswjcbbc.supabase.co",
  "sb_publishable_1CfbMk6CtDd684PkEgkhAA_BaNO2l5j"
);

const [{ data: criteres }, { data: filieres }] = await Promise.all([
  sb.from("criteres_classement").select("matiere, filiere_id, serie_bac"),
  sb.from("filieres").select("id, intitule, mode_entree"),
]);

const fMap = new Map(filieres.map((f) => [f.id, f]));

// Slash SANS parenthèse — ces libellés passent bruts dans l'étape 2
const hits = criteres.filter(
  (r) => r.matiere && r.matiere.includes("/") && !r.matiere.includes("(")
);

// Grouper par libellé
const grouped = new Map();
for (const r of hits) {
  if (!grouped.has(r.matiere)) grouped.set(r.matiere, []);
  grouped.get(r.matiere).push(r);
}

console.log("\n=== Matières avec '/' sans condition ===");
for (const [mat, rows] of [...grouped.entries()].sort(
  (a, b) => b[1].length - a[1].length
)) {
  const fils = [...new Set(rows.map((r) => fMap.get(r.filiere_id)?.intitule))];
  console.log(`\n"${mat}"  (${fils.length} filière${fils.length > 1 ? "s" : ""})`);
  fils.forEach((f) => console.log(`  · ${f}`));
}

// Série D
console.log("\n=== Cas visibles pour série D ===");
const serieD = hits.filter((r) => /(?:^|,\s*)D(?:\s*,|$)/.test(r.serie_bac));
const seenD = new Set();
for (const r of serieD) {
  const key = `${r.matiere}||${r.filiere_id}`;
  if (seenD.has(key)) continue;
  seenD.add(key);
  const f = fMap.get(r.filiere_id);
  console.log(`  "${r.matiere}" — ${f?.intitule} [${f?.mode_entree || "NULL"}]`);
}
