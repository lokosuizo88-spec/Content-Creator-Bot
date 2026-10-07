import { gemini } from "./gemini.mjs";
import { esc } from "./util.mjs";

const cssUrl = (u) => esc(u).replace(/'/g, "%27");
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }

/** Textos reales con IA a partir de lo extraído de su web. Lanza si Gemini falla (no se genera demo con relleno). */
export async function generarTextos(neg, marca) {
  const textos = await gemini(
    `Eres copywriter para un negocio local. Reescribe la web de "${neg.nombre}" (${neg.direccion}) usando SOLO la información real de abajo; no inventes tratamientos, precios ni premios.
Devuelve JSON: {"eslogan":"max 8 palabras","hero":"1-2 frases","cta":"texto botón reserva","servicios":[{"titulo":"","texto":"1 frase"}] (4-6),"por_que":[{"titulo":"","texto":"1 frase"}] (3),"sobre":"2-3 frases","en":{"eslogan":"","hero":"","cta":""}}
Título web: ${marca.titulo}
Descripción: ${marca.descripcion}
Textos de su web:
${marca.textos.join("\n")}`,
    { json: true },
  );
  return validarTextos(textos);
}

export function validarTextos(textos) {
  const required = ["eslogan", "hero", "cta", "sobre"];
  if (!textos || required.some((key) => typeof textos[key] !== "string" || !textos[key].trim()) ||
      !Array.isArray(textos.servicios) || !textos.servicios.length || !Array.isArray(textos.por_que)) {
    throw new Error("Gemini devolvió un JSON incompleto para la demo");
  }
  for (const [key, rows] of [["servicios", textos.servicios], ["por_que", textos.por_que]]) {
    if (rows.some((row) => !row || typeof row.titulo !== "string" || typeof row.texto !== "string")) {
      throw new Error(`Gemini devolvió ${key} con elementos incompletos`);
    }
  }
  return textos;
}

// ── Motor de composición: cada demo elige su propia estructura ─────────────────
const pick = (arr, n) => arr[Math.abs(n) % arr.length];
const NAVS = ["barra", "centrada", "minima"];
const HEROES = ["split", "editorial", "centrado", "portada", "apilado"];
const SERVS = ["cards", "lista", "filas", "bento"];
const ABOUTS = ["foto", "centrado", "franja"];
const GALS = ["tira", "mosaico", "rejilla"];
const CTAS = ["banda", "dividido", "minimo"];
const ORDENES = [
  ["servicios", "about", "galeria", "cta"],
  ["about", "servicios", "galeria", "cta"],
  ["servicios", "galeria", "about", "cta"],
  ["about", "galeria", "servicios", "cta"],
];

const R = {
  nav: (v, c) => {
    const links = `<a href="#servicios">Tratamientos</a><a href="#sobre">Nosotros</a><a href="#cita">Cita</a>`;
    if (v === "centrada") return `<header class="nav centrada"><div class="brand">${c.logo}</div><nav>${links}</nav></header>`;
    if (v === "minima") return `<header class="nav"><div class="brand">${c.logo}</div><a class="btn sm" href="#cita">${esc(c.t.cta)}</a></header>`;
    return `<header class="nav"><div class="brand">${c.logo}</div><nav>${links}</nav></header>`;
  },
  hero: (v, c) => {
    const { t, neg, foto } = c;
    const h = `<h1>${esc(t.eslogan)}</h1><p>${esc(t.hero)}</p><a class="btn" href="#cita">${esc(t.cta)}</a>`;
    const img = `<div class="img" style="background-image:url('${cssUrl(foto)}')"></div>`;
    if (v === "split") return `<section class="hero split"><div class="txt">${h}</div>${img}</section>`;
    if (v === "editorial") return `<section class="hero editorial">${img}<div class="txt"><small>${esc(neg.direccion || "")}</small>${h}</div></section>`;
    if (v === "portada") return `<section class="hero portada" style="background-image:linear-gradient(180deg,#0000 20%,#000a),url('${cssUrl(foto)}')"><div class="txt">${h}</div></section>`;
    if (v === "apilado") return `<section class="hero apilado"><div class="txt">${h}</div>${img}</section>`;
    return `<section class="hero centrado" style="background-image:linear-gradient(color-mix(in srgb,var(--c1) 85%,transparent),color-mix(in srgb,var(--c1) 85%,transparent)),url('${cssUrl(foto)}')">${h}</section>`;
  },
  servicios: (v, c) => {
    const L = c.t.servicios;
    const head = `<h2>Tratamientos</h2>`;
    if (v === "lista") return `<section class="s" id="servicios">${head}<ol class="lista">${L.map((s, i) => `<li class="rv" style="--i:${i}"><span class="n">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div></li>`).join("")}</ol></section>`;
    if (v === "filas") return `<section class="s" id="servicios">${head}<div class="filas">${L.slice(0, 4).map((s, i) => `<article class="fila rv${i % 2 ? " inv" : ""}"><div class="ph" style="background-image:url('${cssUrl(c.fotos[i % Math.max(1, c.fotos.length)] || c.foto)}')"></div><div><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></div></article>`).join("")}</div></section>`;
    if (v === "bento") return `<section class="s" id="servicios">${head}<div class="bento">${L.map((s, i) => `<article class="bx rv b${i % 5}" style="--i:${i}"><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></article>`).join("")}</div></section>`;
    return `<section class="s" id="servicios">${head}<div class="grid">${L.map((s, i) => `<article class="card rv" style="--i:${i}"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></article>`).join("")}</div></section>`;
  },
  about: (v, c) => {
    const { t, neg } = c;
    const por = t.por_que.map((s, i) => `<div class="rv" style="--i:${i}"><h4>${esc(s.titulo)}</h4><p>${esc(s.texto)}</p></div>`).join("");
    const stat = `<div class="stat"><b>${esc(String(neg.nota).replace(".", ","))}★</b><span>${esc(String(neg.resenas))} reseñas en Google</span></div>`;
    if (v === "foto") return `<section class="s alt" id="sobre"><div class="dos"><div class="ph tall" style="background-image:url('${cssUrl(c.fotos[0] || c.foto)}')"></div><div><h2>Sobre ${esc(neg.nombre)}</h2><p class="lead">${esc(t.sobre)}</p><div class="por">${por}</div></div></div></section>`;
    if (v === "franja") return `<section class="s alt" id="sobre"><div class="franja">${stat}<div><h2>Sobre ${esc(neg.nombre)}</h2><p class="lead">${esc(t.sobre)}</p></div></div><div class="por tres">${por}</div></section>`;
    return `<section class="s alt cen" id="sobre"><h2>Sobre ${esc(neg.nombre)}</h2><p class="lead">${esc(t.sobre)}</p><div class="por tres">${por}</div></section>`;
  },
  galeria: (v, c) => {
    const f = c.fotos;
    if (f.length < 2) return "";
    const im = (u, i) => `<img class="rv" style="--i:${i}" src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`;
    return `<section class="s"><div class="gal ${v}">${f.slice(0, v === "mosaico" ? 5 : 4).map(im).join("")}</div></section>`;
  },
  cta: (v, c) => {
    const action = c.neg.telefono ? `<a class="btn alt" href="tel:${esc(c.neg.telefono.replace(/\s/g, ""))}">Llamar para pedir cita</a>` : `<p class="pending">Enlace de reserva pendiente de configurar</p>`;
    const tel = c.neg.telefono ? `<a class="tel" href="tel:${esc(c.neg.telefono.replace(/\s/g, ""))}">${esc(c.neg.telefono)}</a>` : "";
    if (v === "dividido") return `<section class="s cta dividido" id="cita"><div><h2>${esc(c.t.cta)}</h2><p>${esc(c.neg.direccion || "")}</p></div><div>${action}${tel}</div></section>`;
    if (v === "minimo") return `<section class="s cta minimo" id="cita"><h2>${esc(c.t.cta)}</h2>${action}${tel}</section>`;
    return `<section class="s cta" id="cita"><h2>${esc(c.t.cta)}</h2>${action}${tel}</section>`;
  },
};

/** idx: posición de la demo en el lote; rota todas las elecciones para que dos demos seguidas nunca compartan estructura. */
export function renderDemo(neg, marca, t, idx = 0) {
  const h = hash(neg.nombre + (neg.web || ""));
  const c1 = marca.colores[0] || "#1f2937";
  const c2 = marca.colores[1] || "#b08d57";
  const onC1 = lum(c1) > 0.6 ? "#111" : "#fff";
  const oscuro = !!marca.oscuro;
  const gen = /^(sans-serif|serif|system-ui|arial|helvetica)/i;
  const serif = /serif|georgia|playfair|times|garamond|cormorant/i.test(marca.fuenteTitulo || "");
  const fh = marca.fuenteTitulo && !gen.test(marca.fuenteTitulo) ? marca.fuenteTitulo : serif || h % 2 ? "Playfair Display" : "Poppins";
  const fb = marca.fuenteCuerpo && !gen.test(marca.fuenteCuerpo) ? marca.fuenteCuerpo : "Inter";
  const radio = marca.radio ?? pick([6, 14, 24], h >> 2);
  const fotos = marca.fotos || [];
  const foto = fotos[0] || "";
  const c = {
    neg, t, foto, fotos: fotos.slice(1),
    logo: marca.logo
      ? `<img class="logo" src="${esc(marca.logo)}" alt="${esc(neg.nombre)}" onerror="this.replaceWith(document.createTextNode('${esc(neg.nombre).replace(/'/g, "")}'))">`
      : `<span class="wordmark">${esc(neg.nombre)}</span>`,
  };
  const cfg = {
    nav: pick(NAVS, h + idx),
    hero: pick(HEROES, (h >> 3) + idx),
    servicios: pick(SERVS, (h >> 5) + idx),
    about: pick(ABOUTS, (h >> 7) + idx),
    galeria: pick(GALS, (h >> 9) + idx),
    cta: pick(CTAS, (h >> 11) + idx),
    orden: pick(ORDENES, (h >> 13) + idx),
  };
  const cuerpo = cfg.orden.map((k) => R[k](cfg[k], c)).join("\n");
  const fonts = [...new Set([fh, fb])].map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join("&");
  const css = `
:root{--ease:cubic-bezier(.23,1,.32,1);--c1:${c1};--c2:${c2};--on:${onC1};--r:${radio}px;--fh:'${fh}',serif;--fb:'${fb}',sans-serif;
--bg:${oscuro ? "#0f1115" : "#fff"};--fg:${oscuro ? "#eceef2" : "#222"};--mut:${oscuro ? "#aab0bb" : "#555"};--card:${oscuro ? "#181b21" : "#fff"};--line:${oscuro ? "#ffffff1a" : "#0000001a"};--alt:${oscuro ? "#14171c" : "color-mix(in srgb,var(--c1) 7%,#fff)"}}
*{box-sizing:border-box;margin:0}body{font-family:var(--fb);color:var(--fg);background:var(--bg);line-height:1.6}
.nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 5vw;position:sticky;top:0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);z-index:9;border-bottom:1px solid var(--line)}
.nav.centrada{flex-direction:column;gap:8px}.logo{height:44px;width:auto}.wordmark{font-family:var(--fh);font-weight:700;font-size:1.3rem}
.nav a{color:var(--fg);text-decoration:none;font-weight:500}.nav nav a{margin-left:24px}.nav.centrada nav a{margin:0 12px}
.btn{display:inline-block;background:var(--c1);color:var(--on);padding:14px 28px;border-radius:min(999px,calc(var(--r) * 2 + 8px));text-decoration:none;font-weight:600;transition:transform 160ms var(--ease),box-shadow 160ms var(--ease)}
.btn:active{transform:scale(.97)}.btn.alt{background:#fff;color:var(--c1)}.btn.sm{padding:10px 20px}
h1,h2,h3,h4{font-family:var(--fh);line-height:1.15${marca.mayus ? ";text-transform:uppercase;letter-spacing:.03em" : ""}}h1{font-size:clamp(2.2rem,5vw,4rem);margin-bottom:20px}
.hero{min-height:78vh;display:grid;background-size:cover;background-position:center}.hero .img,.ph{background-size:cover;background-position:center;background-color:var(--alt)}
.hero p{font-size:1.2rem;margin-bottom:28px;max-width:34em;color:var(--mut)}.hero .txt{padding:8vw 5vw;align-self:center}
.hero.split{grid-template-columns:1fr 1fr}.hero.editorial{grid-template-columns:1.1fr 1fr}.hero.editorial small{letter-spacing:.15em;text-transform:uppercase;color:var(--c2)}
.hero.centrado{place-content:center;text-align:center;color:#fff;padding:10vw 5vw}.hero.centrado p{margin-inline:auto;color:#fffd}.hero.centrado .btn{justify-self:center}
.hero.portada{align-items:end;color:#fff}.hero.portada p{color:#fffd}.hero.portada .txt{padding-bottom:8vh}
.hero.apilado{min-height:0}.hero.apilado .txt{padding:9vw 5vw 4vw;max-width:1000px}.hero.apilado .img{min-height:46vh;margin:0 5vw;border-radius:var(--r)}
section.s{padding:84px 5vw}h2{font-size:clamp(1.8rem,3.5vw,2.6rem);margin-bottom:40px}.lead{font-size:1.15rem;max-width:44em;margin-bottom:36px;color:var(--mut)}.cen{text-align:center}.cen .lead{margin-inline:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
.card,.bx{padding:28px;border:1px solid var(--line);border-radius:var(--r);background:var(--card);transition:transform 200ms var(--ease),box-shadow 200ms var(--ease)}
.n{color:var(--c2);font-weight:700}.card h3,.bx h3{margin:8px 0}p{color:var(--mut)}
.lista{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:8px 56px}.lista li{display:flex;gap:20px;padding:22px 0;border-top:1px solid var(--line)}.lista .n{font-family:var(--fh);font-size:2.2rem;line-height:1}
.filas{display:grid;gap:48px}.fila{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.fila.inv .ph{order:2}.fila .ph{min-height:260px;border-radius:var(--r)}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}.bx.b0{grid-column:span 3;background:var(--c1);color:var(--on)}.bx.b0 p{color:inherit;opacity:.85}.bx.b1{grid-column:span 3}.bx.b2,.bx.b3,.bx.b4{grid-column:span 2}
.alt{background:var(--alt)}.dos{display:grid;grid-template-columns:1fr 1.2fr;gap:56px;align-items:center}.ph.tall{min-height:440px;border-radius:var(--r)}
.por{display:grid;gap:22px}.por.tres{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));text-align:left}.por div{padding-left:18px;border-left:3px solid var(--c2)}
.franja{display:grid;grid-template-columns:auto 1fr;gap:56px;align-items:center;margin-bottom:48px}.stat{background:var(--c1);color:var(--on);padding:36px 44px;border-radius:var(--r);text-align:center}.stat b{display:block;font:700 3.4rem var(--fh)}.stat span{opacity:.85}
.gal{display:grid;gap:16px}.gal img{width:100%;object-fit:cover;border-radius:var(--r)}.gal.tira{grid-auto-flow:column;grid-auto-columns:minmax(280px,1fr);overflow-x:auto}.gal.tira img{height:320px}
.gal.rejilla{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.gal.rejilla img{height:260px}.gal.mosaico{grid-template-columns:repeat(4,1fr);grid-auto-rows:200px}.gal.mosaico img{height:100%}.gal.mosaico img:first-child{grid-column:span 2;grid-row:span 2}
.cta{background:var(--c1);color:var(--on);text-align:center}.cta .btn{background:#fff;color:var(--c1)}.cta p{color:inherit;opacity:.85}.tel{color:inherit;display:block;margin-top:18px;font-size:1.4rem}
.cta.dividido{display:grid;grid-template-columns:1fr auto;gap:40px;align-items:center;text-align:left}.cta.dividido h2{margin:0 0 8px}.cta.minimo{background:var(--bg);color:var(--fg);border-top:1px solid var(--line)}.cta.minimo .btn{background:var(--c1);color:var(--on);margin-top:20px}
footer{padding:24px 5vw;font-size:.85rem;color:var(--mut);text-align:center}
@media(hover:hover) and (pointer:fine){.card:hover,.bx:hover,.js .rv.in.card:hover,.js .rv.in.bx:hover{transform:translateY(-4px);box-shadow:0 14px 34px #0002}.btn:hover{box-shadow:0 8px 24px #0003}.nav a:hover{color:var(--c1)}}
.js .rv{opacity:0;transform:translateY(12px);transition:opacity 450ms var(--ease),transform 450ms var(--ease);transition-delay:calc(var(--i,0)*60ms)}.js .rv.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.js .rv{transform:none;transition:opacity 200ms}.btn,.card,.bx{transition:none}}
@media(max-width:800px){.hero.split,.hero.editorial,.dos,.fila,.franja,.cta.dividido{grid-template-columns:1fr}.hero .img{min-height:280px}.hero.split .img,.hero.editorial .img{order:-1}.nav nav{display:none}.fila.inv .ph{order:0}.bento{grid-template-columns:1fr}.bx.b0,.bx.b1,.bx.b2,.bx.b3,.bx.b4{grid-column:auto}.gal.mosaico{grid-template-columns:1fr 1fr}.cta.dividido{text-align:center}}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(neg.nombre)} — propuesta de web</title>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet"><style>${css}</style></head><body>
${R.nav(cfg.nav, c)}
${R.hero(cfg.hero, c)}
${cuerpo}
<footer>Propuesta de rediseño preparada por Strauss Digital · Maqueta no oficial basada en la identidad pública de ${esc(neg.nombre)}</footer>
<script>document.documentElement.classList.add('js');var nodes=document.querySelectorAll('.rv,section.s h2');if('IntersectionObserver'in window){var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -60px'});nodes.forEach(function(el){el.classList.add('rv');io.observe(el)})}else{nodes.forEach(function(el){el.classList.add('in')})}</script>
</body></html>`;
}

