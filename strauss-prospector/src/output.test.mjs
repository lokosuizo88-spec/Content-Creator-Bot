// Comprueba en Chromium las demos que ha generado `node src/index.mjs` (salida/*/demos/*/index.html).
// Sin salida (p.ej. `npm test` en el job de tests) se omite; con DEMOS > 0 exige al menos una demo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { join, resolve, normalize, sep, extname } from 'node:path';
import { chromium } from 'playwright';

const SALIDA = resolve(process.env.SALIDA_DIR || 'salida');
const VIEWPORTS = [{ nombre: 'desktop', width: 1440, height: 900 }, { nombre: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }];
const PROHIBIDO = [/\bundefined\b/, /\bnull\b/, /\bNaN\b/, /\bTODO\b/, /lorem/i];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const dirs = (p) => (existsSync(p) ? readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory()) : []);
const demos = dirs(SALIDA).flatMap((run) =>
  dirs(join(SALIDA, run, 'demos'))
    .filter((id) => existsSync(join(SALIDA, run, 'demos', id, 'index.html')))
    .map((id) => ({ run, id, ruta: `/${run}/demos/${id}/index.html`, qa: join(SALIDA, run, 'qa') })),
);
const esperadas = Number(process.env.DEMOS ?? 0) > 0;
const hasBrowser = existsSync(chromium.executablePath());

test('salida: hay demos generadas para comprobar', { skip: !esperadas && !demos.length && 'No hay demos en salida/' }, () => {
  assert.ok(demos.length > 0, `DEMOS=${process.env.DEMOS} pero no hay ninguna demo en ${SALIDA}`);
});

if (demos.length) {
  test('demos generadas: escritorio y móvil en Chromium', { skip: !hasBrowser && 'Instala Chromium con npx playwright install chromium' }, async (t) => {
    const server = createServer(async (req, res) => {
      const ruta = normalize(join(SALIDA, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!ruta.startsWith(SALIDA + sep)) return res.writeHead(403).end();
      try {
        const body = await readFile(ruta);
        res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    t.after(async () => {
      await browser.close();
      server.closeAllConnections();
      server.close();
    });

    for (const demo of demos) {
      for (const vp of VIEWPORTS) {
        await t.test(`${demo.id} · ${vp.nombre} ${vp.width}px`, async () => {
          const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
          const page = await ctx.newPage();
          const errores = [];
          page.on('pageerror', (e) => errores.push(e.message));
          const imagenesRotas = [];
          page.on('requestfailed', (r) => r.resourceType() === 'image' && imagenesRotas.push(`${r.url()} (${r.failure()?.errorText})`));
          page.on('response', (r) => r.request().resourceType() === 'image' && r.status() >= 400 && imagenesRotas.push(`${r.url()} (${r.status()})`));
          try {
            const resp = await page.goto(base + demo.ruta, { waitUntil: 'load', timeout: 30_000 });
            assert.equal(resp?.status(), 200, 'la demo no carga');
            // Recorre la página para disparar las animaciones de aparición (IntersectionObserver) y la carga diferida de imágenes.
            await page.evaluate(async () => {
              for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight / 2)) {
                scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 100));
              }
              scrollTo(0, 0);
            });
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
            await page.waitForTimeout(800);

            const info = await page.evaluate(() => {
              const de = document.documentElement;
              const h1 = document.querySelector('h1');
              const texto = document.body?.innerText || '';
              const atributos = [...document.querySelectorAll('[href],[src],[alt],[title]')].flatMap((el) =>
                ['href', 'src', 'alt', 'title'].map((a) => el.getAttribute(a)).filter(Boolean),
              );
              const enlaces = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href').trim());
              const anclasRotas = enlaces
                .filter((h) => h.startsWith('#'))
                .filter((h) => h === '#' || !document.getElementById(decodeURIComponent(h.slice(1))) && !document.getElementsByName(decodeURIComponent(h.slice(1))).length);
              const relativos = enlaces.filter((h) => h && !h.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(h) && !h.startsWith('//'));
              return {
                ancho: de.clientWidth,
                scroll: Math.max(de.scrollWidth, document.body?.scrollWidth || 0),
                h1: h1?.innerText.trim() || '',
                largo: texto.trim().length,
                texto,
                atributos,
                anclasRotas,
                relativos: relativos.map((h) => new URL(h, location.href).pathname),
              };
            });

            assert.ok(info.h1, 'falta un <h1> con texto');
            assert.ok(info.largo > 200, `contenido insuficiente (${info.largo} caracteres)`);
            assert.deepEqual(errores, [], 'errores JavaScript en la página');
            assert.deepEqual(imagenesRotas, [], 'imágenes que no cargan');
            assert.ok(info.scroll <= info.ancho, `desbordamiento horizontal: scrollWidth ${info.scroll} > ${info.ancho}`);
            assert.deepEqual(info.anclasRotas, [], 'enlaces internos (#ancla) sin destino');
            for (const ruta of new Set(info.relativos)) {
              const r = await page.request.get(base + ruta);
              assert.ok(r.ok(), `enlace interno roto: ${ruta} → ${r.status()}`);
            }
            for (const patron of PROHIBIDO) {
              const fuente = [info.texto, ...info.atributos].find((s) => patron.test(s));
              const i = fuente ? fuente.search(patron) : 0;
              assert.equal(fuente, undefined, `texto prohibido ${patron}: "…${fuente?.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ')}…"`);
            }
          } finally {
            mkdirSync(demo.qa, { recursive: true });
            await page.screenshot({ path: join(demo.qa, `${demo.id}-${vp.nombre}.png`), fullPage: true }).catch(() => {});
            await ctx.close();
          }
        });
      }
    }
  });
}
