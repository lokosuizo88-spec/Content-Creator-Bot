import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publicar, ultimaCarpetaDemos, quierePublicar, urlBase, INDICE } from './publicar.mjs';

const BASE = 'https://main.demo-test.pages.dev';

/** Web publicada simulada: un mapa ruta → contenido. Desplegar la sustituye entera, como Cloudflare Pages. */
function webSimulada(inicial = {}) {
  let sitio = new Map(Object.entries(inicial));
  const pedidos = [];
  let lecturasIndice = 0;
  const alLeerIndice = [];
  const descargar = async (url) => {
    pedidos.push(url);
    let ruta = url.slice(BASE.length + 1).split('?')[0];
    if (ruta === INDICE) alLeerIndice[lecturasIndice++]?.(sitio);
    if (ruta.endsWith('/') || ruta === '') ruta += 'index.html';
    if (!sitio.has(ruta)) return new Response('no', { status: 404 });
    return new Response(sitio.get(ruta), { status: 200 });
  };
  const despliegues = [];
  const ejecutar = (cmd, args) => {
    const carpeta = args[args.indexOf('deploy') + 1];
    const nuevo = new Map();
    for (const f of readdirSync(carpeta, { recursive: true })) {
      if (statSync(join(carpeta, f)).isFile()) nuevo.set(f.split(sep).join('/'), readFileSync(join(carpeta, f), 'utf8'));
    }
    despliegues.push({ cmd, args, archivos: [...nuevo.keys()].sort() });
    sitio = nuevo;
  };
  return { descargar, ejecutar, despliegues, pedidos, alLeerIndice, get sitio() { return sitio; }, set sitio(v) { sitio = v; } };
}

async function salidaCon(t, demos) {
  const dir = await mkdtemp(join(tmpdir(), 'demos-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [id, archivos] of Object.entries(demos)) {
    for (const [f, contenido] of Object.entries(archivos)) {
      await mkdir(join(dir, id, ...f.split('/').slice(0, -1)), { recursive: true });
      await writeFile(join(dir, id, ...f.split('/')), contenido);
    }
  }
  return dir;
}

const indice = (demos) => JSON.stringify({ demos });

test('publicar: conserva las demos ya publicadas y añade las nuevas', async (t) => {
  const web = webSimulada({
    [INDICE]: indice({ antigua: { archivos: ['index.html', 'img/foto-1.jpg'] }, repetida: { archivos: ['index.html'] } }),
    'antigua/index.html': '<h1>antigua</h1>',
    'antigua/img/foto-1.jpg': 'jpg-antiguo',
    'repetida/index.html': '<h1>repetida v1</h1>',
  });
  const dir = await salidaCon(t, {
    nueva: { 'index.html': '<h1>nueva</h1>', 'img/foto-1.webp': 'webp' },
    repetida: { 'index.html': '<h1>repetida v2</h1>' },
  });
  const r = await publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: web.ejecutar, espera: 0 });

  assert.deepEqual(r.conservadas, ['antigua']);
  assert.deepEqual(r.nuevas.sort(), ['nueva', 'repetida']);
  assert.equal(web.despliegues.length, 1);
  const { cmd, args, archivos } = web.despliegues[0];
  assert.equal(cmd, process.platform === 'win32' ? process.execPath : 'npx');
  const cliArgs = process.platform === 'win32' ? args.slice(1) : args;
  assert.deepEqual([...cliArgs.slice(0, 4), ...cliArgs.slice(5)], ['--yes', 'wrangler@4', 'pages', 'deploy', '--project-name', 'demo-test', '--branch', 'main', '--commit-dirty=true']);
  assert.deepEqual(archivos, ['_headers', 'antigua/img/foto-1.jpg', 'antigua/index.html', INDICE, 'nueva/img/foto-1.webp', 'nueva/index.html', 'repetida/index.html', 'robots.txt'].sort());
  // Tras desplegar, lo antiguo sigue online, lo repetido está actualizado y el índice lista todo.
  assert.equal(web.sitio.get('antigua/img/foto-1.jpg'), 'jpg-antiguo');
  assert.equal(web.sitio.get('repetida/index.html'), '<h1>repetida v2</h1>');
  const publicado = JSON.parse(web.sitio.get(INDICE));
  assert.deepEqual(Object.keys(publicado.demos).sort(), ['antigua', 'nueva', 'repetida']);
  assert.deepEqual(publicado.demos.nueva.archivos, ['img/foto-1.webp', 'index.html']);

  // Una segunda publicación tampoco pierde nada.
  const dir2 = await salidaCon(t, { otra: { 'index.html': '<h1>otra</h1>' } });
  await publicar({ dir: dir2, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: web.ejecutar, espera: 0 });
  assert.deepEqual(Object.keys(JSON.parse(web.sitio.get(INDICE)).demos).sort(), ['antigua', 'nueva', 'otra', 'repetida']);
  assert.equal(web.sitio.get('nueva/img/foto-1.webp'), 'webp');
});

test('publicar: sin índice publicado parte de las demos que ya estaban online', async (t) => {
  const inicial = JSON.parse(readFileSync(fileURLToPath(new URL('../demos-publicadas-inicial.json', import.meta.url)), 'utf8'));
  const ids = Object.keys(inicial.demos);
  assert.ok(ids.length >= 5);
  const web = webSimulada(Object.fromEntries(ids.map((id) => [`${id}/index.html`, `<h1>${id}</h1>`])));
  const dir = await salidaCon(t, { nueva: { 'index.html': '<h1>nueva</h1>' } });
  const r = await publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: web.ejecutar, espera: 0 });
  assert.deepEqual(r.conservadas.sort(), [...ids].sort());
  for (const id of ids) assert.equal(web.sitio.get(`${id}/index.html`), `<h1>${id}</h1>`);
});

test('publicar: si no puede leer lo publicado, no despliega', async (t) => {
  const dir = await salidaCon(t, { nueva: { 'index.html': 'x' } });
  const llamadas = [];
  const ejecutar = () => llamadas.push(1);
  await assert.rejects(
    publicar({ dir, base: BASE, ejecutar, descargar: async () => { throw new TypeError('fetch failed'); } }),
    /No se puede leer lo publicado.*No se publica/,
  );
  await assert.rejects(publicar({ dir, base: BASE, ejecutar, descargar: async () => new Response('', { status: 503 }) }), /HTTP 503/);
  const web = webSimulada({ [INDICE]: indice({ antigua: { archivos: ['index.html'] } }) });
  const fallaDemo = async (url) => (url.includes(INDICE) ? web.descargar(url) : new Response('', { status: 500 }));
  await assert.rejects(publicar({ dir, base: BASE, ejecutar, descargar: fallaDemo }), /No se pudo descargar antigua/);
  assert.equal(llamadas.length, 0);
});

test('publicar: si una demo del índice da 404, no despliega ni la borra', async (t) => {
  const web = webSimulada({ [INDICE]: indice({ desaparecida: { archivos: ['index.html'] }, viva: {} }), 'viva/index.html': 'v' });
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  await assert.rejects(publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: web.ejecutar, espera: 0 }), /No se publica para no borrar/);
  assert.equal(web.despliegues.length, 0);
  assert.deepEqual(Object.keys(JSON.parse(web.sitio.get(INDICE)).demos).sort(), ['desaparecida', 'viva']);
});

test('publicar: rechaza rutas inseguras del índice sin desplegar', async (t) => {
  const web = webSimulada({ [INDICE]: indice({ antigua: { archivos: ['index.html', '../fuera.txt'] } }), 'antigua/index.html': 'v' });
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  await assert.rejects(publicar({ dir, base: BASE, descargar: web.descargar, ejecutar: web.ejecutar }), /Archivos no válidos/);
  assert.equal(web.despliegues.length, 0);
});

test('publicar: falla si tras desplegar alguna demo no responde', async (t) => {
  const web = webSimulada({ [INDICE]: indice({}) });
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  const desplegarSinNueva = (cmd, args) => { web.ejecutar(cmd, args); web.sitio.delete('nueva/index.html'); };
  await assert.rejects(
    publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: desplegarSinNueva, espera: 0 }),
    /no responden: https:\/\/main\.demo-test\.pages\.dev\/nueva\//,
  );
});

test('publicar: falla si el despliegue no llega a la web', async (t) => {
  const web = webSimulada({ [INDICE]: indice({}) });
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  const sinDesplegar = () => {}; // el despliegue "no llega": la web sigue sin la demo nueva
  await assert.rejects(
    publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: sinDesplegar, espera: 0 }),
    /no muestra esta publicación/,
  );
});

test('publicar: si otra publicación cambia la web mientras se prepara, se prepara de nuevo y no la pisa', async (t) => {
  const web = webSimulada({ [INDICE]: indice({ antigua: {} }), 'antigua/index.html': 'a' });
  // Justo al volver a leer el índice antes de desplegar, otra publicación ha añadido «ajena».
  web.alLeerIndice[1] = (sitio) => {
    sitio.set('ajena/index.html', 'x');
    sitio.set(INDICE, JSON.stringify({ actualizado: '2000-01-01T00:00:00.000Z', demos: { antigua: { archivos: ['index.html'] }, ajena: { archivos: ['index.html'] } } }));
  };
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  await publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: web.ejecutar, espera: 0 });
  assert.equal(web.despliegues.length, 1);
  assert.deepEqual(Object.keys(JSON.parse(web.sitio.get(INDICE)).demos).sort(), ['ajena', 'antigua', 'nueva']);
  assert.equal(web.sitio.get('ajena/index.html'), 'x');
});

test('publicar: si la web no deja de cambiar, no despliega', async (t) => {
  const web = webSimulada({ [INDICE]: indice({}) });
  for (let i = 0; i < 10; i++) web.alLeerIndice[i] = (sitio) => sitio.set(INDICE, JSON.stringify({ actualizado: `v${i}`, demos: {} }));
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  await assert.rejects(publicar({ dir, base: BASE, descargar: web.descargar, ejecutar: web.ejecutar, espera: 0 }), /cambia mientras se prepara/);
  assert.equal(web.despliegues.length, 0);
});

test('publicar: avisa si otra publicación posterior ha quitado las demos nuevas', async (t) => {
  const web = webSimulada({ [INDICE]: indice({}) });
  const dir = await salidaCon(t, { nueva: { 'index.html': 'n' } });
  const desplegarYSerPisado = (cmd, args) => {
    web.ejecutar(cmd, args);
    // Otra publicación que leyó la web antes que nosotros termina después y la sustituye sin «nueva».
    web.sitio = new Map([[INDICE, JSON.stringify({ actualizado: '9999-01-01T00:00:00.000Z', demos: {} })]]);
  };
  await assert.rejects(
    publicar({ dir, proyecto: 'demo-test', base: BASE, descargar: web.descargar, ejecutar: desplegarYSerPisado, espera: 0 }),
    /Otra publicación a la vez ha sustituido la web sin incluir: nueva/,
  );
});

test('publicar: sin demos no llama a wrangler; sin carpeta falla; elige la ejecución más reciente', async (t) => {
  const salida = await mkdtemp(join(tmpdir(), 'salida-'));
  t.after(() => rm(salida, { recursive: true, force: true }));
  for (const run of ['2026-10-01-a', '2026-10-07-b']) await mkdir(join(salida, run, 'demos'), { recursive: true });
  await utimes(join(salida, '2026-10-01-a', 'demos'), new Date('2026-10-01'), new Date('2026-10-01'));
  assert.equal(ultimaCarpetaDemos(salida), join(salida, '2026-10-07-b', 'demos'));
  assert.equal(ultimaCarpetaDemos(join(salida, 'no-existe')), null);
  const llamadas = [];
  assert.deepEqual((await publicar({ dir: join(salida, '2026-10-07-b', 'demos'), ejecutar: () => llamadas.push(1) })).nuevas, []);
  assert.equal(llamadas.length, 0);
  await assert.rejects(publicar({ dir: join(salida, 'no-existe') }), /No existe la carpeta/);
});

test('publicar: URL base y PUBLICAR', () => {
  assert.equal(urlBase('strauss-demos', ''), 'https://main.strauss-demos.pages.dev');
  assert.equal(urlBase('strauss-demos', 'https://demos.straussdigital.com/'), 'https://demos.straussdigital.com');
  for (const v of ['s', 'SI', 'true', '1']) assert.equal(quierePublicar(v), true, v);
  for (const v of ['n', 'no', '', undefined, 'sí?']) assert.equal(quierePublicar(v), false, String(v));
});

test('publicar: con PUBLICAR=n el script no publica', () => {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('./publicar.mjs', import.meta.url))], { env: { ...process.env, PUBLICAR: 'n' }, encoding: 'utf8' });
  assert.match(out, /no se publica nada/);
});
