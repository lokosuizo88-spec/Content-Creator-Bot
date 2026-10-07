// Publica en Cloudflare Pages las demos de una ejecución. Se lanza después de src/output.test.mjs,
// para que una demo rota nunca llegue a publicarse.
// Uso: PUBLICAR=s node src/publicar.mjs [salida/<ejecución>/demos]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const quierePublicar = (v = "n") => /^(s|si|true|1)$/i.test(v);

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

export function publicar({ dir, proyecto = "strauss-demos", ejecutar = execFileSync } = {}) {
  if (!dir || !existsSync(dir)) throw new Error(`No existe la carpeta de demos: ${dir}`);
  const ids = demosEn(dir);
  if (!ids.length) {
    console.log(`Nada que publicar en ${dir}`);
    return [];
  }
  console.log(`▶ Publicando ${ids.length} demos de ${dir} en Cloudflare Pages (${proyecto})…`);
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  ejecutar(npx, ["--yes", "wrangler@4", "pages", "deploy", resolve(dir), "--project-name", proyecto, "--branch", "main", "--commit-dirty=true"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return ids;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  if (!quierePublicar(process.env.PUBLICAR)) {
    console.log("PUBLICAR no está activado; no se publica nada.");
  } else {
    const dir = process.argv[2] || ultimaCarpetaDemos();
    if (!dir) throw new Error("No hay ninguna carpeta salida/*/demos que publicar");
    publicar({ dir, proyecto: process.env.CF_PROJECT || "strauss-demos" });
  }
}
