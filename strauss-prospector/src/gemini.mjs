import { sleep } from "./util.mjs";
import { openrouter } from "./openrouter.mjs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Modelos estables de respaldo cuando el principal está saturado (503) o no está disponible.
const RESPALDO = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
let last = 0;

const num = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : Number(process.env[k]));
export const modelos = () =>
  [...new Set([MODEL, ...(process.env.GEMINI_FALLBACK_MODELS ? process.env.GEMINI_FALLBACK_MODELS.split(",") : RESPALDO)].map((m) => m.trim()).filter(Boolean))];

/**
 * Llama a Gemini con pausa entre llamadas, límite de tiempo por petición y reintentos con backoff
 * (429/5xx, errores de red, cuelgues). Si un modelo sigue fallando, pasa al siguiente de `modelos()`.
 * Los errores de clave (401/403) cortan en el acto. Lanza error si ningún modelo responde.
 */
export async function gemini(prompt, { json = false, retries = 2 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    if (process.env.OPENROUTER_API_KEY) return openrouter(prompt, { json, retries });
    throw new Error("falta GEMINI_API_KEY u OPENROUTER_API_KEY");
  }
  const gap = num("GEMINI_GAP_MS", 13000);
  const timeout = num("GEMINI_TIMEOUT_MS", 90000);
  const backoff = num("GEMINI_BACKOFF_MS", 5000);
  const limite = num("GEMINI_DEADLINE_MS", process.env.OPENROUTER_API_KEY ? 2 * 60000 : 8 * 60000);
  const fin = Date.now() + limite;
  const fallos = [];
  modelosGemini: for (const [n, model] of modelos().entries()) {
    if (n > 0) process.stdout.write(`[${model}] `);
    for (let i = 0; i <= retries; i++) {
      if (Date.now() >= fin) {
        if (!process.env.OPENROUTER_API_KEY) throw new Error(`Gemini sin respuesta útil en ${Math.round(limite / 1000)} s (${fallos.slice(-4).join("; ")})`);
        fallos.push(`Gemini sin respuesta útil en ${Math.round(limite / 1000)} s`);
        break modelosGemini;
      }
      const wait = last + gap - Date.now();
      if (wait > 0) await sleep(Math.min(wait, Math.max(0, fin - Date.now())));
      const restante = fin - Date.now();
      if (restante <= 0) {
        if (!process.env.OPENROUTER_API_KEY) throw new Error(`Gemini sin respuesta útil en ${Math.round(limite / 1000)} s (${fallos.slice(-4).join("; ")})`);
        fallos.push(`Gemini sin respuesta útil en ${Math.round(limite / 1000)} s`);
        break modelosGemini;
      }
      const timeoutPeticion = Math.min(timeout, restante);
      last = Date.now();
      let r;
      let body;
      let data;
      try {
        r = await fetch(`${process.env.GEMINI_URL || "https://generativelanguage.googleapis.com"}/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
          }),
          signal: AbortSignal.timeout(timeoutPeticion),
        });
        if (r.ok) {
          data = await r.json();
        } else {
          body = await r.text();
        }
      } catch (e) {
        fallos.push(`${model}: ${e.name === "TimeoutError" ? `sin respuesta en ${timeoutPeticion / 1000}s` : e.message}`);
        const pausa = Math.min(60000, backoff * 2 ** i, Math.max(0, fin - Date.now()));
        if (i < retries && pausa > 0) await sleep(pausa);
        continue;
      }
      if (r.ok) {
        const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
        if (!txt) throw new Error("respuesta vacía");
        return json ? JSON.parse(txt) : txt;
      }
      if (r.status === 401 || r.status === 403) throw new Error(`Gemini ${r.status}: ${body.slice(0, 200)}`);
      fallos.push(`${model}: ${r.status}`);
      if (r.status === 404 || r.status === 400) break; // modelo inexistente o no admitido: probar el siguiente
      if (![429, 500, 502, 503, 504].includes(r.status)) throw new Error(`Gemini ${r.status}: ${body.slice(0, 200)}`);
      if (i < retries) {
        const m = body.match(/retry in ([\d.]+)s/i);
        const pausa = m ? Math.min(60000, Math.ceil(Number(m[1]) * 1000) + 1000) : Math.min(60000, backoff * 2 ** i);
        const restante = Math.max(0, fin - Date.now());
        if (restante > 0) await sleep(Math.min(pausa, restante));
      }
    }
  }
  if (process.env.OPENROUTER_API_KEY) {
    process.stdout.write("[OpenRouter] ");
    try {
      return await openrouter(prompt, { json, retries });
    } catch (e) {
      fallos.push(`OpenRouter: ${e.message}`);
    }
  }
  throw new Error(`Gemini no disponible tras probar ${modelos().join(", ")} (${fallos.slice(-4).join("; ")})`);
}
