import { sleep } from "./util.mjs";

export const OPENROUTER_DEFAULT_MODEL = "upstage/solar-mini4";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
let last = 0;

const num = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : Number(process.env[k]));

function contentOf(data) {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : part?.text || "").join("");
  return "";
}

/** Llama a OpenRouter con el formato compatible con la API de OpenAI. */
export async function openrouter(prompt, { json = false, retries = 2, deadline } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("falta OPENROUTER_API_KEY");
  const model = process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL;
  const gap = num("OPENROUTER_GAP_MS", 1000);
  const timeout = num("OPENROUTER_TIMEOUT_MS", 90000);
  const backoff = num("OPENROUTER_BACKOFF_MS", 3000);
  const fin = deadline ?? Date.now() + num("OPENROUTER_DEADLINE_MS", 8 * 60000);
  const fallos = [];

  for (let i = 0; i <= retries; i++) {
    if (Date.now() > fin) break;
    const wait = last + gap - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let r;
    try {
      r = await fetch(process.env.OPENROUTER_URL || ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
          "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://github.com/lokosuizo88-spec/Content-Creator-Bot",
          "X-OpenRouter-Title": "Strauss Prospector",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (e) {
      fallos.push(e.name === "TimeoutError" ? `sin respuesta en ${timeout / 1000}s` : e.message);
      if (i < retries) await sleep(Math.min(60000, backoff * 2 ** i));
      continue;
    }
    if (r.ok) {
      const text = contentOf(await r.json());
      if (!text) throw new Error("OpenRouter devolvió una respuesta vacía");
      return json ? JSON.parse(text) : text;
    }
    const body = await r.text();
    if (r.status === 401 || r.status === 403) throw new Error(`OpenRouter ${r.status}: ${body.slice(0, 200)}`);
    fallos.push(String(r.status));
    if (![408, 429, 500, 502, 503, 504].includes(r.status)) throw new Error(`OpenRouter ${r.status}: ${body.slice(0, 200)}`);
    if (i < retries) await sleep(Math.min(60000, backoff * 2 ** i));
  }
  throw new Error(`OpenRouter no disponible con ${model} (${fallos.join("; ") || "plazo agotado"})`);
}
