import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { guardarImagenes } from './util.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('imágenes: copia logo y fotos en la demo aunque el origen bloquee el Referer', async (t) => {
  const server = createServer((req, res) => {
    if (req.headers.referer) return req.socket.destroy(); // como un servidor con protección anti-hotlinking
    if (req.url.startsWith('/foto') || req.url === '/logo') return res.writeHead(200, { 'content-type': 'image/png' }).end(PNG);
    if (req.url === '/pagina') return res.writeHead(200, { 'content-type': 'text/html' }).end('<p>no es imagen</p>');
    res.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const dir = await mkdtemp(join(tmpdir(), 'demo-'));
  t.after(async () => {
    server.closeAllConnections();
    server.close();
    await rm(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const marca = { colores: ['#123456'], logo: `${base}/logo`, fotos: [`${base}/foto1`, `${base}/no-existe`, `${base}/pagina`, `${base}/foto2`, 'data:image/png;base64,xx'] };

  const local = await guardarImagenes(marca, dir);

  assert.equal(local.logo, 'img/logo.png');
  assert.deepEqual(local.fotos, ['img/foto-1.png', 'img/foto-4.png']);
  assert.deepEqual(local.colores, marca.colores);
  assert.deepEqual((await readdir(join(dir, 'img'))).sort(), ['foto-1.png', 'foto-4.png', 'logo.png']);
  assert.deepEqual(await readFile(join(dir, 'img', 'foto-1.png')), PNG);
});

test('imágenes: sin logo descargable devuelve null para usar el nombre como marca', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'demo-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const local = await guardarImagenes({ logo: null, fotos: [] }, dir);
  assert.equal(local.logo, null);
  assert.deepEqual(local.fotos, []);
});
