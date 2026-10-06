import { chromium } from "playwright";

const lanzar = () => chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

/** HTML renderizado con navegador real: para webs que bloquean fetch (403/anti-bot). */
export async function paginaRenderizada(url) {
  const b = await lanzar();
  try {
    const page = await b.newPage();
    const t0 = Date.now();
    const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    return { ok: !!r && r.status() < 400, status: r?.status() ?? 0, html: await page.content(), ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, html: "", ms: 0, error: e.message };
  } finally {
    await b.close();
  }
}

/** Abre la web real y extrae identidad: logo, colores, fuentes, fotos, textos de servicios. Devuelve también captura. */
export async function extraerMarca(url, shotPath) {
  const browser = await lanzar();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    if (shotPath) await page.screenshot({ path: shotPath }).catch(() => {});
    const d = await page.evaluate(() => {
      const abs = (u) => { if (!u) return null; try { return new URL(u, location.href).href; } catch { return null; } };
      const css = (el, p) => getComputedStyle(el)[p];
      const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const hex = (a) => "#" + a.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
      const sat = (a) => { const mx = Math.max(...a), mn = Math.min(...a); return mx === 0 ? 0 : (mx - mn) / mx; };
      // colores: botones, enlaces, cabecera
      const votos = {};
      for (const el of document.querySelectorAll("a,button,header,nav,h1,h2,[class*=btn],[class*=button]")) {
        for (const p of ["backgroundColor", "color"]) {
          const c = css(el, p);
          if (!c || c.includes("rgba(0, 0, 0, 0)")) continue;
          const a = rgb(c);
          if (a.length < 3 || sat(a) < 0.25 || Math.max(...a) < 40) continue;
          votos[hex(a)] = (votos[hex(a)] || 0) + (p === "backgroundColor" ? 3 : 1);
        }
      }
      const colores = Object.entries(votos).sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 3);
      const theme = document.querySelector('meta[name="theme-color"]')?.content;
      // logo
      const logoEl = [...document.images].find((i) => /logo/i.test(i.src + i.alt + i.className + (i.parentElement?.className || "")) && i.naturalWidth > 30);
      const logo = logoEl ? abs(logoEl.currentSrc || logoEl.src) : abs(document.querySelector('link[rel~="icon"]')?.href);
      // fotos grandes
      const fotos = [...document.images]
        .filter((i) => i.naturalWidth >= 600 && i.naturalHeight >= 350 && !/logo|icon|sprite/i.test(i.src))
        .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
        .map((i) => abs(i.currentSrc || i.src)).filter(Boolean);
      const og = abs(document.querySelector('meta[property="og:image"]')?.content);
      if (og) fotos.unshift(og);
      const bodyBg = css(document.body, 'backgroundColor');
      const isTransparent = (value) => value === 'transparent' || /rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(value);
      const selectedBg = isTransparent(bodyBg) ? css(document.documentElement, 'backgroundColor') : bodyBg;
      const bgc = rgb(selectedBg);
      const bgLum = bgc.length >= 3 && !isTransparent(selectedBg) ? (0.299 * bgc[0] + 0.587 * bgc[1] + 0.114 * bgc[2]) / 255 : 1;
      const btn = document.querySelector('a[class*=btn],button,a[class*=button]');
      const radio = btn ? Math.min(40, parseFloat(css(btn, 'borderRadius')) || 0) : null;
      const mayus = css(document.querySelector('h1,h2') || document.body, 'textTransform') === 'uppercase';
      const body = css(document.body, "fontFamily");
      const head = css(document.querySelector("h1,h2") || document.body, "fontFamily");
      const textos = [...document.querySelectorAll("h1,h2,h3,li,p")].map((e) => e.innerText.trim()).filter((t) => t.length > 8 && t.length < 160).slice(0, 80);
      return {
        titulo: document.title,
        descripcion: document.querySelector('meta[name="description"]')?.content || "",
        colores: theme ? [theme, ...colores] : colores,
        logo,
        fotos: [...new Set(fotos)].slice(0, 8),
        fuenteTitulo: head.split(",")[0].replace(/["']/g, "").trim(),
        fuenteCuerpo: body.split(",")[0].replace(/["']/g, "").trim(),
        textos,
        oscuro: bgLum < 0.35,
        radio,
        mayus,
      };
    });
    return d;
  } finally {
    await browser.close();
  }
}
