import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publicar, ultimaCarpetaDemos, quierePublicar } from './publicar.mjs';

async function salidaDePrueba(t) {
  const salida = await mkdtemp(join(tmpdir(), 'salida-'));
  t.after(() => rm(salida, { recursive: true, force: true }));
  for (const run of ['2026-10-01-a', '2026-10-07-b']) {
    await mkdir(join(salida, run, 'demos', 'clinica'), { recursive: true });
    await writeFile(join(salida, run, 'demos', 'clinica', 'index.html'), '<h1>x</h1>');
  }
  await mkdir(join(salida, '2026-10-07-b', 'demos', 'sin-index'));
  await utimes(join(salida, '2026-10-01-a', 'demos'), new Date('2026-10-01'), new Date('2026-10-01'));
  return salida;
}

test('publicar: despliega la carpeta de demos con wrangler y el proyecto indicado', async (t) => {
  const salida = await salidaDePrueba(t);
  const dir = ultimaCarpetaDemos(salida);
  assert.equal(dir, join(salida, '2026-10-07-b', 'demos'));
  const llamadas = [];
  const ids = publicar({ dir, proyecto: 'demo-test', ejecutar: (cmd, args) => llamadas.push([cmd, args]) });
  assert.deepEqual(ids, ['clinica']);
  assert.equal(llamadas.length, 1);
  assert.match(llamadas[0][0], /^npx(\.cmd)?$/);
  assert.deepEqual(llamadas[0][1], ['--yes', 'wrangler@4', 'pages', 'deploy', resolve(dir), '--project-name', 'demo-test', '--branch', 'main', '--commit-dirty=true']);
});

test('publicar: sin demos no llama a wrangler; sin carpeta falla', async (t) => {
  const salida = await mkdtemp(join(tmpdir(), 'salida-'));
  t.after(() => rm(salida, { recursive: true, force: true }));
  await mkdir(join(salida, 'run', 'demos'), { recursive: true });
  const llamadas = [];
  assert.deepEqual(publicar({ dir: join(salida, 'run', 'demos'), ejecutar: () => llamadas.push(1) }), []);
  assert.equal(llamadas.length, 0);
  assert.throws(() => publicar({ dir: join(salida, 'no-existe') }), /No existe la carpeta/);
  assert.equal(ultimaCarpetaDemos(join(salida, 'no-existe')), null);
});

test('publicar: solo con PUBLICAR=s/si/true/1', () => {
  for (const v of ['s', 'SI', 'true', '1']) assert.equal(quierePublicar(v), true, v);
  for (const v of ['n', 'no', '', undefined, 'sí?']) assert.equal(quierePublicar(v), false, String(v));
});

test('publicar: con PUBLICAR=n el script no publica', () => {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('./publicar.mjs', import.meta.url))], { env: { ...process.env, PUBLICAR: 'n', CLOUDFLARE_API_TOKEN: '' }, encoding: 'utf8' });
  assert.match(out, /no se publica nada/);
});
