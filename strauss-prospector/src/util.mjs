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
