import test from "node:test";
import assert from "node:assert/strict";
import { openrouter } from "./openrouter.mjs";
import { gemini } from "./gemini.mjs";

test("OpenRouter usa el modelo barato por defecto, la clave en Authorization y JSON estructurado", async () => {
  const previous = { fetch: globalThis.fetch, env: { ...process.env } };
  process.env.OPENROUTER_API_KEY = "clave-de-prueba";
  delete process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_GAP_MS = "0";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(options.headers.authorization, "Bearer clave-de-prueba");
    assert.doesNotMatch(url, /clave-de-prueba/);
    const body = JSON.parse(options.body);
    assert.equal(body.model, "upstage/solar-mini4");
    assert.deepEqual(body.response_format, { type: "json_object" });
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await openrouter("prueba", { json: true }), { ok: true });
  } finally {
    globalThis.fetch = previous.fetch;
    for (const key of Object.keys(process.env)) if (!(key in previous.env)) delete process.env[key];
    Object.assign(process.env, previous.env);
  }
});

test("OpenRouter reintenta un error temporal", async () => {
  const previous = { fetch: globalThis.fetch, env: { ...process.env } };
  process.env.OPENROUTER_API_KEY = "clave-de-prueba";
  process.env.OPENROUTER_GAP_MS = "0";
  process.env.OPENROUTER_BACKOFF_MS = "1";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return new Response("ocupado", { status: 503 });
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  };
  try {
    assert.equal(await openrouter("prueba", { retries: 1 }), "ok");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const key of Object.keys(process.env)) if (!(key in previous.env)) delete process.env[key];
    Object.assign(process.env, previous.env);
  }
});

test("Gemini usa OpenRouter si no hay clave de Gemini", async () => {
  const previous = { fetch: globalThis.fetch, env: { ...process.env } };
  delete process.env.GEMINI_API_KEY;
  process.env.OPENROUTER_API_KEY = "clave-de-prueba";
  process.env.OPENROUTER_GAP_MS = "0";
  globalThis.fetch = async (url, options) => {
    assert.match(url, /openrouter\.ai\/api\/v1\/chat\/completions$/);
    assert.equal(options.headers.authorization, "Bearer clave-de-prueba");
    return new Response(JSON.stringify({ choices: [{ message: { content: "respuesta" } }] }), { status: 200 });
  };
  try {
    assert.equal(await gemini("prueba"), "respuesta");
  } finally {
    globalThis.fetch = previous.fetch;
    for (const key of Object.keys(process.env)) if (!(key in previous.env)) delete process.env[key];
    Object.assign(process.env, previous.env);
  }
});

test("Gemini pasa a OpenRouter cuando agota su plazo", async () => {
  const previous = { fetch: globalThis.fetch, env: { ...process.env } };
  process.env.GEMINI_API_KEY = "clave-gemini-de-prueba";
  process.env.OPENROUTER_API_KEY = "clave-openrouter-de-prueba";
  process.env.GEMINI_DEADLINE_MS = "-1";
  process.env.OPENROUTER_GAP_MS = "0";
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.match(url, /openrouter\.ai\/api\/v1\/chat\/completions$/);
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await gemini("prueba", { json: true }), { ok: true });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const key of Object.keys(process.env)) if (!(key in previous.env)) delete process.env[key];
    Object.assign(process.env, previous.env);
  }
});
