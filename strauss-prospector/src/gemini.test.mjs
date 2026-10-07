import test from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from './gemini.mjs';

test('Gemini usa el modelo vigente, la cabecera de clave y JSON estructurado', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'clave-de-prueba';
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /\/v1beta\/models\/gemini-3\.8-flash:generateContent$/);
      assert.equal(options.headers['x-goog-api-key'], 'clave-de-prueba');
      assert.doesNotMatch(url, /clave-de-prueba/);
      const body = JSON.parse(options.body);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      assert.equal(body.generationConfig.temperature, undefined);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    };
    assert.deepEqual(await gemini('prueba', { json: true }), { ok: true });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});

const ok = (text = '{"ok":true}') => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
const saturado = () => new Response(JSON.stringify({ error: { code: 503, message: 'This model is currently experiencing high demand.' } }), { status: 503 });

/** Ejecuta `fn` con un fetch simulado y esperas mínimas; devuelve los modelos pedidos en orden. */
async function conFetch(respuestas, fn, env = {}) {
  const previo = { fetch: globalThis.fetch, env: { ...process.env } };
  Object.assign(process.env, { GEMINI_API_KEY: 'clave-de-prueba', GEMINI_GAP_MS: '0', GEMINI_BACKOFF_MS: '1', GEMINI_FALLBACK_MODELS: '' }, env);
  const pedidos = [];
  globalThis.fetch = async (url, options) => {
    pedidos.push(url.match(/models\/([^:]+):/)[1]);
    const r = respuestas.shift();
    return typeof r === 'function' ? r(options) : r;
  };
  try {
    await fn();
  } finally {
    globalThis.fetch = previo.fetch;
    for (const k of Object.keys(process.env)) if (!(k in previo.env)) delete process.env[k];
    Object.assign(process.env, previo.env);
  }
  return pedidos;
}

test('Gemini: si el modelo principal sigue saturado (503) pasa al de respaldo', async () => {
  const pedidos = await conFetch([saturado(), saturado(), saturado(), ok()], async () => {
    assert.deepEqual(await gemini('prueba', { json: true }), { ok: true });
  });
  assert.deepEqual(pedidos, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.7-flash']);
});

test('Gemini: reintenta errores de red y peticiones colgadas', async () => {
  const colgada = (options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason)));
  const pedidos = await conFetch([() => { throw new TypeError('fetch failed'); }, colgada, ok('hola')], async () => {
    assert.equal(await gemini('prueba'), 'hola');
  }, { GEMINI_TIMEOUT_MS: '50' });
  assert.deepEqual(pedidos, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.8-flash']);
});

test('Gemini: un modelo inexistente (404) salta al siguiente sin reintentar', async () => {
  const pedidos = await conFetch([new Response('{}', { status: 404 }), ok()], async () => {
    await gemini('prueba', { json: true });
  });
  assert.deepEqual(pedidos, ['gemini-3.8-flash', 'gemini-3.7-flash']);
});

test('Gemini: una clave rechazada (403) falla en el acto', async () => {
  const pedidos = await conFetch([new Response('{"error":"PERMISSION_DENIED"}', { status: 403 })], async () => {
    await assert.rejects(gemini('prueba'), /Gemini 403/);
  });
  assert.equal(pedidos.length, 1);
});

test('Gemini: si ningún modelo responde, el error nombra los modelos probados', async () => {
  const pedidos = await conFetch(Array.from({ length: 12 }, saturado), async () => {
    await assert.rejects(gemini('prueba'), /Gemini no disponible tras probar gemini-3\.8-flash, gemini-3\.7-flash, gemini-3\.5-flash, gemini-3\.5-flash-lite/);
  });
  assert.equal(pedidos.length, 12);
});

test('Gemini: GEMINI_FALLBACK_MODELS sustituye la lista de respaldo y hay un tope de tiempo total', async () => {
  const pedidos = await conFetch([saturado(), saturado(), saturado(), ok()], async () => {
    await gemini('prueba', { json: true });
  }, { GEMINI_FALLBACK_MODELS: 'gemini-3.5-flash-lite' });
  assert.deepEqual(pedidos.at(-1), 'gemini-3.5-flash-lite');
  await conFetch(Array.from({ length: 12 }, saturado), async () => {
    await assert.rejects(gemini('prueba'), /sin respuesta útil/);
  }, { GEMINI_DEADLINE_MS: '0', GEMINI_BACKOFF_MS: '5' });
});
