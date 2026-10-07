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
