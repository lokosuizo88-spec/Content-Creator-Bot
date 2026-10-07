import { sleep } from "./util.mjs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GAP_MS = Number(process.env.GEMINI_GAP_MS || 13000);
let last = 0;

/** Llama a Gemini con pausa entre llamadas y reintentos con backoff (503/429). Lanza error si agota reintentos. */
export async function gemini(prompt, { json = false, retries = 6 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("falta GEMINI_API_KEY");
  for (let i = 0; i <= retries; i++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const r = await fetch(`${process.env.GEMINI_URL || "https://generativelanguage.googleapis.com"}/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const txt = d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
      if (!txt) throw new Error("respuesta vacía");
      return json ? JSON.parse(txt) : txt;
    }
    if ([429, 500, 503].includes(r.status) && i < retries) {
      const body = await r.text();
      const m = body.match(/retry in ([\d.]+)s/i);
      await sleep(m ? Math.ceil(Number(m[1]) * 1000) + 1000 : Math.min(60000, 5000 * 2 ** i));
      continue;
    }
    throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  throw new Error("Gemini: reintentos agotados");
}
