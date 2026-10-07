import { mkdir, writeFile } from "node:fs/promises";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
export function uniqueSlugs(names) {
  const counts = new Map();
  const used = new Set();
  return names.map((name) => {
    const base = slug(name) || "negocio";
    let count = (counts.get(base) || 0) + 1;
    let candidate = count === 1 ? base : `${base}-${count}`;
    while (used.has(candidate)) candidate = `${base}-${++count}`;
    counts.set(base, count);
    used.add(candidate);
    return candidate;
  });
}
export const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export async function fetchText(url, ms = 20000) {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; StraussBot/2.0)" } });
    const html = await r.text();
    return { ok: r.ok, status: r.status, html, ms: Date.now() - t0, url: r.url };
  } catch (e) {
    return { ok: false, status: 0, html: "", ms: Date.now() - t0, url, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

const EXT_IMAGEN = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif", "image/svg+xml": "svg", "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico" };

/** Descarga una imagen; null si no es una imagen válida. Sin Referer, así que pasa los bloqueos de hotlinking. */
export async function descargarImagen(url, ms = 20000, max = 8 * 1024 * 1024) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; StraussBot/2.0)", accept: "image/*" } });
    const ext = EXT_IMAGEN[(r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()];
    if (!r.ok || !ext) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length && buf.length <= max ? { buf, ext } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Copia logo y fotos de la marca en `${carpeta}/img/` y devuelve la marca con rutas relativas (img/…). Descarta las que fallan. */
export async function guardarImagenes(marca, carpeta) {
  await mkdir(`${carpeta}/img`, { recursive: true });
  const guardar = async (url, nombre) => {
    if (!url || !/^https?:/i.test(url)) return null;
    const img = await descargarImagen(url);
    if (!img) return null;
    await writeFile(`${carpeta}/img/${nombre}.${img.ext}`, img.buf);
    return `img/${nombre}.${img.ext}`;
  };
  const fotos = (await Promise.all((marca.fotos || []).map((u, i) => guardar(u, `foto-${i + 1}`)))).filter(Boolean);
  return { ...marca, logo: await guardar(marca.logo, "logo"), fotos };
}
