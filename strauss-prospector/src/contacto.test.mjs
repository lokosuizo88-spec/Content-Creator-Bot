import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { extraerEmail, enlacesContacto, buscarContacto } from './audit.mjs';
import { envioCsv } from './email.mjs';

test('contacto: prefiere el correo del dominio de la propia web y los mailto:', () => {
  const html = `<p>Escríbenos a otra@gmail.com</p><a href="mailto:Info@Clinica.es?subject=Cita">info</a><p>reservas@clinica.es</p>`;
  assert.equal(extraerEmail(html, 'https://www.clinica.es/'), 'info@clinica.es');
  assert.equal(extraerEmail('<p>hola@ventas.clinica.es y otro@gmail.com</p>', 'https://clinica.es'), 'hola@ventas.clinica.es');
  assert.equal(extraerEmail('<p>solo@gmail.com</p>', 'https://clinica.es'), 'solo@gmail.com');
});

test('contacto: descarta imágenes, servicios técnicos y correos de ejemplo', () => {
  const html = `<img src="logo@2x.png"><script>"abc@sentry.io"</script><p>noreply@clinica.es tu@example.com</p><a href="mailto:%20">x</a>`;
  assert.equal(extraerEmail(html, 'https://clinica.es'), null);
  assert.equal(extraerEmail('<p>nada aquí</p>', 'no-es-una-url'), null);
});

test('contacto: si la portada no tiene correo, lo busca en /contacto', async (t) => {
  const pedidos = [];
  const server = createServer((req, res) => {
    pedidos.push(req.url);
    if (req.url === '/contacto') return res.writeHead(200, { 'content-type': 'text/html' }).end('<a href="mailto:hola@127.0.0.1.test">x</a> <p>citas@local.test</p>');
    res.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const web = `http://127.0.0.1:${server.address().port}/`;
  const audit = { info: { email: null } };
  assert.equal(await buscarContacto({ web }, audit), 'hola@127.0.0.1.test');
  assert.equal(audit.info.email, 'hola@127.0.0.1.test');
  assert.deepEqual(pedidos, ['/contacto']);
  // Con correo en la portada o sin web no hace peticiones.
  assert.equal(await buscarContacto({ web }, { info: { email: 'ya@clinica.es' } }), 'ya@clinica.es');
  assert.equal(await buscarContacto({ web: '' }, { info: {} }), null);
  assert.equal(pedidos.length, 1);
});

test('envíos: CSV con BOM, comillas, comas y saltos de línea escapados', () => {
  const email = 'Asunto: He revisado la web de "Clínica, S.L."\n\nHola,\nlínea dos\n';
  const csv = envioCsv([
    { para: 'info@clinica.es', email, demo: 'https://main.strauss-demos.pages.dev/clinica/' },
    { para: '', email: 'Asunto: Sin contacto\n\nCuerpo', demo: '' },
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff, 'empieza con BOM para que Excel lea las tildes');
  assert.ok(csv.slice(1).startsWith('para,asunto,cuerpo,demo\r\n'));
  const [, fila1, fila2] = csv.slice(1).split(/\r\n(?=")/);
  assert.equal(fila1, '"info@clinica.es","He revisado la web de ""Clínica, S.L.""","Hola,\nlínea dos","https://main.strauss-demos.pages.dev/clinica/"');
  assert.equal(fila2.trimEnd(), '"","Sin contacto","Cuerpo",""');
});

test('contacto: usa los enlaces de contacto de la propia web y no los de otros dominios', () => {
  const html = `<a href="/conocenos/contacto">Contacto</a><a href="https://www.clinica.es/contact-us#form">EN</a><a href="https://facebook.com/contacto">fb</a><a href="mailto:x@clinica.es">m</a><a href="/conocenos/contacto">otra vez</a>`;
  assert.deepEqual(enlacesContacto(html, 'https://clinica.es/'), ['https://clinica.es/conocenos/contacto', 'https://www.clinica.es/contact-us']);
  assert.deepEqual(enlacesContacto(html, 'no-es-url'), []);
});
