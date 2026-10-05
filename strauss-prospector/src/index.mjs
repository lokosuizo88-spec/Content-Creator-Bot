import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { buscar } from "./places.mjs";
import { auditar, PROBLEMAS } from "./audit.mjs";
import { extraerMarca } from "./brand.mjs";
import { generarTextos, renderDemo } from "./demo.mjs";
import { redactarEmail } from "./email.mjs";
import { slug, esc } from "./util.mjs";

const env = (k, d) => process.env[k] || d;
const SECTOR = env("SECTOR", "clínicas estéticas");
const ZONA = env("ZONA", "Palma de Mallorca");
const REVISAR = Number(env("REVISAR", 20));
const DEMOS = Number(env("DEMOS", 3));
const PUBLICAR = /^(s|si|true|1)$/i.test(env("PUBLICAR", "n"));
const BASE_URL = env("DEMOS_BASE_URL", ""); // p.ej. https://demos.straussdigital.com
const MIN_PTS = Number(env("MIN_PTS", 3)); // sin problemas relevantes no se prospecta
const PROYECTO = env("CF_PROJECT", "strauss-demos");

const dir = `salida/${new Date().toISOString().slice(0, 10)}-${slug(SECTOR)}-${slug(ZONA)}`;
await mkdir(`${dir}/demos`, { recursive: true });
await mkdir(`${dir}/emails`, { recursive: true });
await mkdir(`${dir}/capturas`, { recursive: true });

console.log(`▶ Buscando "${SECTOR}" en ${ZONA}…`);
const todos = await buscar(SECTOR, ZONA, REVISAR);
const buenos = todos.filter((n) => n.nota >= 4.3 && n.resenas >= 60);
console.log(`  ${todos.length} encontrados · ${buenos.length} con nota ≥ 4.3 y ≥ 60 reseñas`);

const res = [];
for (const n of buenos) {
  const a = await auditar(n);
  console.log(`  · ${n.nombre.slice(0, 60)} → ${a.pts} pts ${a.flags.join(", ")}${a.motivo ? ` (${a.motivo})` : ""}`);
  res.push({ ...n, audit: a });
}
res.sort((x, y) => y.audit.pts - x.audit.pts);

console.log(`\n▶ Construyendo hasta ${DEMOS} demos…`);
let hechas = 0;
for (const r of res) {
  r.id = slug(r.nombre);
  if (hechas < DEMOS && r.web && r.audit.pts >= MIN_PTS && !r.audit.flags.includes("web_caida")) {
    try {
      process.stdout.write(`  · ${r.nombre}: marca… `);
      const marca = await extraerMarca(r.web, `${dir}/capturas/${r.id}.png`);
      process.stdout.write("textos… ");
      const t = await generarTextos(r, marca);
      await mkdir(`${dir}/demos/${r.id}`, { recursive: true });
      await writeFile(`${dir}/demos/${r.id}/index.html`, renderDemo(r, marca, t, hechas));
      r.demo = true;
      r.marca = marca;
      hechas++;
      console.log("ok");
    } catch (e) {
      console.log(`SIN DEMO (${e.message})`);
    }
  }
}
await writeFile(`${dir}/demos/_headers`, "/*\n  X-Robots-Tag: noindex\n");

if (PUBLICAR && hechas) {
  console.log(`\n▶ Publicando en Cloudflare Pages (${PROYECTO})…`);
  execSync(`npx --yes wrangler@4 pages deploy "${dir}/demos" --project-name ${PROYECTO} --branch main --commit-dirty=true`, { stdio: "inherit" });
}

for (const r of res.filter((x) => x.audit.flags.length && x.audit.pts >= MIN_PTS)) {
  const url = r.demo ? `${BASE_URL || `https://${PROYECTO}.pages.dev`}/${r.id}/` : "";
  r.email = redactarEmail(r, r.audit, url);
  await writeFile(`${dir}/emails/${r.id}.txt`, r.email);
}

const filas = res
  .map(
    (r) => `<tr><td><b>${esc(r.nombre)}</b><br><small>${esc(r.web || "sin web")}</small></td><td>${r.audit.pts}</td>
<td>${r.audit.flags.map((f) => `<span title="${esc(PROBLEMAS[f]?.problema || "")}">${f}</span>`).join(" ")}</td>
<td>${r.demo ? `<a href="demos/${r.id}/index.html">demo</a>` : "—"}</td><td><details><summary>email</summary><pre>${esc(r.email)}</pre></details></td></tr>`,
  )
  .join("");
await writeFile(
  `${dir}/panel.html`,
  `<!doctype html><meta charset=utf-8><title>Panel</title><style>body{font:14px system-ui;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}span{background:#eef;padding:2px 6px;border-radius:6px;margin:2px;display:inline-block}pre{white-space:pre-wrap;max-width:60ch}</style><h1>${esc(SECTOR)} · ${esc(ZONA)}</h1><table><tr><th>Negocio<th>Pts<th>Problemas<th>Demo<th>Email</tr>${filas}</table>`,
);
console.log(`\n✔ Listo: ${dir}/panel.html · ${hechas} demos · ${res.length} emails`);
