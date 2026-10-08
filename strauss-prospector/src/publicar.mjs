// Publica en Cloudflare Pages las demos de una ejecución. Se lanza después de src/output.test.mjs,
// para que una demo rota nunca llegue a publicarse.
// Uso: PUBLICAR=s node src/publicar.mjs [salida/<ejecución>/demos]
//
// Cada despliegue de Cloudflare Pages sustituye todo lo publicado. Para no romper los enlaces de
// emails ya enviados, antes de desplegar se descargan de la web en vivo todas las demos que figuran
// en su índice (indice-demos.json) y se suben junto con las nuevas. Si no se puede leer lo publicado,
// no se publica.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const INDICE = "indice-demos.json";
const INICIAL = fileURLToPath(new URL("../demos-publicadas-inicial.json", import.meta.url));
const idSeguro = (id) => /^[a-z0-9][a-z0-9-]*$/.test(id);
const archivoSeguro = (f) => typeof f === "string" && !!f && !f.includes("\\") && !f.startsWith("/") && f.split("/").every((p) => p && p !== "." && p !== "..");

export const quierePublicar = (v = "n") => /^(s|si|true|1)$/i.test(v);
export const urlBase = (proyecto = "strauss-demos", base = process.env.DEMOS_BASE_URL) => (base || `https://main.${proyecto}.pages.dev`).replace(/\/+$/, "");

/** Carpeta de demos de la ejecución más reciente en `salida`, o null. */
export function ultimaCarpetaDemos(salida = "salida") {
  if (!existsSync(salida)) return null;
  const carpetas = readdirSync(salida)
    .map((d) => join(salida, d, "demos"))
    .filter((d) => existsSync(d) && statSync(d).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return carpetas[0] || null;
}

/** Ids de las demos (subcarpetas con index.html). */
export const demosEn = (dir) => readdirSync(dir).filter((id) => existsSync(join(dir, id, "index.html")));

/** Archivos de una demo, relativos a su carpeta y con "/". */
function archivos(carpeta) {
  return readdirSync(carpeta, { recursive: true })
    .filter((f) => statSync(join(carpeta, f)).isFile())
    .map((f) => f.split(sep).join("/"))
    .sort();
}

/** Lee el índice de lo publicado. Sin índice todavía, parte de la lista inicial del repositorio. */
async function leerPublicado(base, descargar) {
  let r;
  try {
    r = await descargar(`${base}/${INDICE}`, { cache: "no-store" });
  } catch (e) {
    throw new Error(`No se puede leer lo publicado en ${base} (${e.message}). No se publica para no romper enlaces.`);
  }
  if (r.status === 404) {
    const inicial = JSON.parse(readFileSync(INICIAL, "utf8"));
    console.log(`  Aún no hay ${INDICE} publicado: se parte de las ${Object.keys(inicial.demos).length} demos de demos-publicadas-inicial.json`);
    return inicial;
  }
  if (!r.ok) throw new Error(`No se puede leer ${base}/${INDICE} (HTTP ${r.status}). No se publica para no romper enlaces.`);
  const indice = await r.json();
  if (!indice || !indice.demos || typeof indice.demos !== "object" || Array.isArray(indice.demos)) throw new Error(`${INDICE} publicado no es válido. No se publica.`);
  return indice;
}

/**
 * Prepara la carpeta a desplegar: lo ya publicado + las demos nuevas de `dir` (las nuevas sustituyen
 * a las publicadas con el mismo id). Si falta algún archivo anterior, detiene el despliegue.
 */
export async function prepararDespliegue({ dir, base, descargar = fetch, ahora = new Date() }) {
  const nuevas = demosEn(dir);
  if (!nuevas.every(idSeguro)) throw new Error("Nombre de demo no válido. No se publica.");
  const publicado = await leerPublicado(base, descargar);
  const carpeta = mkdtempSync(join(tmpdir(), "demos-"));
  const indice = { actualizado: ahora.toISOString(), demos: {} };
  const conservadas = [];
  try {
  for (const [id, info] of Object.entries(publicado.demos)) {
    if (!idSeguro(id) || !info || typeof info !== "object") throw new Error(`Entrada insegura en ${INDICE}: ${id}. No se publica.`);
    if (nuevas.includes(id)) continue;
    const ficheros = info.archivos?.length ? info.archivos : ["index.html"];
    if (!Array.isArray(ficheros) || !ficheros.includes("index.html") || !ficheros.every(archivoSeguro)) throw new Error(`Archivos no válidos para ${id}. No se publica.`);
    for (const f of ficheros) {
      let r;
      try {
        r = await descargar(`${base}/${id}/${f === "index.html" ? "" : f}`, { cache: "no-store" });
      } catch (e) {
        throw new Error(`No se pudo descargar ${id}/${f} (${e.message}). No se publica para no romper enlaces.`);
      }
      if (r.status === 404) throw new Error(`Falta ${id}/${f} en la web publicada. No se publica para no borrar la demo anterior.`);
      if (!r.ok) throw new Error(`No se pudo descargar ${id}/${f} (HTTP ${r.status}). No se publica para no romper enlaces.`);
      const destino = join(carpeta, id, ...f.split("/"));
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
    }
    indice.demos[id] = { ...info, archivos: ficheros };
    conservadas.push(id);
  }

  for (const id of nuevas) {
    cpSync(join(dir, id), join(carpeta, id), { recursive: true });
    indice.demos[id] = { publicada: ahora.toISOString().slice(0, 10), archivos: archivos(join(dir, id)) };
  }

  for (const id of Object.keys(indice.demos)) {
    if (!existsSync(join(carpeta, id, "index.html"))) throw new Error(`Falta ${id}/index.html en la carpeta a desplegar. No se publica.`);
  }
  writeFileSync(join(carpeta, INDICE), JSON.stringify(indice, null, 2));
  writeFileSync(join(carpeta, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow\n");
  writeFileSync(join(carpeta, "robots.txt"), "User-agent: *\nDisallow: /\n");
  return { carpeta, indice, nuevas, conservadas };
  } catch (e) {
    rmSync(carpeta, { recursive: true, force: true });
    throw e;
  }
}

/** Comprueba tras desplegar que todas las demos del índice responden. Devuelve los ids que no. */
export async function comprobarPublicadas({ base, ids, descargar = fetch, intentos = 6, espera = 5000 }) {
  let pendientes = [...ids];
  for (let i = 0; i < intentos && pendientes.length; i++) {
    if (i) await new Promise((r) => setTimeout(r, espera));
    const res = await Promise.all(pendientes.map((id) => descargar(`${base}/${id}/`, { cache: "no-store" }).then((r) => r.ok, () => false)));
    pendientes = pendientes.filter((_, j) => !res[j]);
  }
  return pendientes;
}

export async function publicar({ dir, proyecto = "strauss-demos", base = urlBase(proyecto), ejecutar = execFileSync, descargar = fetch, espera } = {}) {
  if (!dir || !existsSync(dir)) throw new Error(`No existe la carpeta de demos: ${dir}`);
  if (!demosEn(dir).length) {
    console.log(`Nada que publicar en ${dir}`);
    return { nuevas: [], conservadas: [] };
  }
  const p = await prepararDespliegue({ dir, base, descargar });
  try {
    console.log(`▶ Publicando en Cloudflare Pages (${proyecto}): ${p.nuevas.length} nuevas + ${p.conservadas.length} ya publicadas que se conservan…`);
    const npxCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
    if (process.platform === "win32" && !existsSync(npxCli)) throw new Error("No encuentro npx en esta instalación de Node.js; no se publica.");
    const args = ["--yes", "wrangler@4", "pages", "deploy", p.carpeta, "--project-name", proyecto, "--branch", "main", "--commit-dirty=true"];
    ejecutar(process.platform === "win32" ? process.execPath : "npx", process.platform === "win32" ? [npxCli, ...args] : args, { stdio: "inherit" });
  } finally {
    rmSync(p.carpeta, { recursive: true, force: true });
  }
  const ids = Object.keys(p.indice.demos);
  const caidas = await comprobarPublicadas({ base, ids, descargar, ...(espera !== undefined ? { espera } : {}) });
  if (caidas.length) throw new Error(`Publicado, pero no responden: ${caidas.map((id) => `${base}/${id}/`).join(", ")}`);
  console.log(`✔ ${ids.length} demos online en ${base}/`);
  return p;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  if (!quierePublicar(process.env.PUBLICAR)) {
    console.log("PUBLICAR no está activado; no se publica nada.");
  } else {
    const dir = process.argv[2] || ultimaCarpetaDemos();
    if (!dir) throw new Error("No hay ninguna carpeta salida/*/demos que publicar");
    const proyecto = process.env.CF_PROJECT || "strauss-demos";
    await publicar({ dir, proyecto, base: urlBase(proyecto) });
  }
}
