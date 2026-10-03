import { gemini } from "./gemini.mjs";
import { esc } from "./util.mjs";

const cssUrl = (u) => esc(u).replace(/'/g, "%27");
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }

/** Textos reales con IA a partir de lo extraído de su web. Lanza si Gemini falla (no se genera demo con relleno). */
export async function generarTextos(neg, marca) {
  return gemini(
    `Eres copywriter para un negocio local. Reescribe la web de "${neg.nombre}" (${neg.direccion}) usando SOLO la información real de abajo; no inventes tratamientos, precios ni premios.
Devuelve JSON: {"eslogan":"max 8 palabras","hero":"1-2 frases","cta":"texto botón reserva","servicios":[{"titulo":"","texto":"1 frase"}] (4-6),"por_que":[{"titulo":"","texto":"1 frase"}] (3),"sobre":"2-3 frases","en":{"eslogan":"","hero":"","cta":""}}
Título web: ${marca.titulo}
Descripción: ${marca.descripcion}
Textos de su web:
${marca.textos.join("\n")}`,
    { json: true },
  );
}

const VARIANTES = ["editorial", "split", "centrado"];

export function renderDemo(neg, marca, t) {
  const v = VARIANTES[hash(neg.nombre) % VARIANTES.length];
  const c1 = marca.colores[0] || "#1f2937";
  const c2 = marca.colores[1] || "#b08d57";
  const onC1 = lum(c1) > 0.6 ? "#111" : "#fff";
  const fh = marca.fuenteTitulo && !/^(sans-serif|serif|system-ui|arial|helvetica)/i.test(marca.fuenteTitulo) ? marca.fuenteTitulo : v === "editorial" ? "Playfair Display" : "Poppins";
  const fb = marca.fuenteCuerpo && !/^(sans-serif|serif|system-ui|arial|helvetica)/i.test(marca.fuenteCuerpo) ? marca.fuenteCuerpo : "Inter";
  const foto = marca.fotos[0] || "";
  const fotos = marca.fotos.slice(1, 4);
  const fonts = [...new Set([fh, fb])].map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join("&");
  const tel = neg.telefono ? `<a class="tel" href="tel:${esc(neg.telefono.replace(/\s/g, ""))}">${esc(neg.telefono)}</a>` : "";
  const servicios = t.servicios.map((s, i) => `<article class="card rv" style="--i:${i}"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p></article>`).join("");
  const porque = t.por_que.map((s) => `<div><h4>${esc(s.titulo)}</h4><p>${esc(s.texto)}</p></div>`).join("");
  const galeria = fotos.map((f) => `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.remove()">`).join("");
  const logo = marca.logo ? `<img class="logo" src="${esc(marca.logo)}" alt="${esc(neg.nombre)}" onerror="this.replaceWith(document.createTextNode('${esc(neg.nombre).replace(/'/g, "")}'))">` : esc(neg.nombre);
  const hero =
    v === "split"
      ? `<section class="hero split"><div class="txt"><h1>${esc(t.eslogan)}</h1><p>${esc(t.hero)}</p><a class="btn" href="#cita">${esc(t.cta)}</a></div><div class="img" style="background-image:url('${cssUrl(foto)}')"></div></section>`
      : v === "centrado"
        ? `<section class="hero centrado" style="background-image:linear-gradient(${c1}cc,${c1}cc),url('${cssUrl(foto)}')"><h1>${esc(t.eslogan)}</h1><p>${esc(t.hero)}</p><a class="btn alt" href="#cita">${esc(t.cta)}</a></section>`
        : `<section class="hero editorial"><div class="img" style="background-image:url('${cssUrl(foto)}')"></div><div class="txt"><small>${esc(neg.direccion || "")}</small><h1>${esc(t.eslogan)}</h1><p>${esc(t.hero)}</p><a class="btn" href="#cita">${esc(t.cta)}</a></div></section>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(neg.nombre)} — propuesta de web</title>
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet"><style>
:root{--ease:cubic-bezier(.23,1,.32,1);--c1:${c1};--c2:${c2};--on:${onC1};--fh:'${fh}',serif;--fb:'${fb}',sans-serif}
*{box-sizing:border-box;margin:0}body{font-family:var(--fb);color:#222;line-height:1.6}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 5vw;position:sticky;top:0;background:#fffffff2;backdrop-filter:blur(8px);z-index:9;border-bottom:1px solid #0001}
.logo{height:44px;width:auto}header nav a{margin-left:24px;color:#222;text-decoration:none;font-weight:500}
.btn{display:inline-block;background:var(--c1);color:var(--on);padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;transition:transform 160ms var(--ease),box-shadow 160ms var(--ease)}.btn:active{transform:scale(.97)}.btn.alt{background:#fff;color:var(--c1)}
h1,h2,h3,h4{font-family:var(--fh);line-height:1.15}h1{font-size:clamp(2.2rem,5vw,4rem);margin-bottom:20px}
.hero{min-height:80vh;display:grid}.hero .img,.hero{background-size:cover;background-position:center}
.hero.split,.hero.editorial{grid-template-columns:1fr 1fr}.hero .txt{padding:8vw 5vw;align-self:center}.hero p{font-size:1.2rem;margin-bottom:28px;max-width:34em}
.hero.editorial{grid-template-columns:1.1fr 1fr}.hero.editorial small{letter-spacing:.15em;text-transform:uppercase;color:var(--c2)}
.hero.centrado{place-content:center;text-align:center;color:#fff;padding:10vw 5vw}.hero.centrado p{margin-inline:auto}
section.s{padding:84px 5vw}h2{font-size:clamp(1.8rem,3.5vw,2.6rem);margin-bottom:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
.card{padding:28px;border:1px solid #0001;border-radius:16px;background:#fff;transition:transform 200ms var(--ease),box-shadow 200ms var(--ease)}@media(hover:hover) and (pointer:fine){.card:hover{transform:translateY(-4px);box-shadow:0 14px 34px #0001}.btn:hover{box-shadow:0 8px 24px #0003}header nav a:hover{color:var(--c1)}}
.card .n{color:var(--c2);font-weight:700}.card h3{margin:8px 0}
.alt-bg{background:color-mix(in srgb,var(--c1) 7%,#fff)}.galeria{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:40px}.galeria img{width:100%;height:260px;object-fit:cover;border-radius:16px}
.por div{padding:0 0 0 18px;border-left:3px solid var(--c2)}
#cita{background:var(--c1);color:var(--on);text-align:center}#cita .btn{background:#fff;color:var(--c1)}.tel{color:inherit;display:block;margin-top:18px;font-size:1.4rem}
.js .rv{opacity:0;transform:translateY(12px);transition:opacity 450ms var(--ease),transform 450ms var(--ease);transition-delay:calc(var(--i,0)*60ms)}.js .rv.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.js .rv{transform:none;transition:opacity 200ms}.btn,.card{transition:none}}
footer{padding:24px 5vw;font-size:.85rem;color:#666;text-align:center}
@media(max-width:800px){.hero.split,.hero.editorial{grid-template-columns:1fr}.hero .img{min-height:280px;order:-1}header nav{display:none}}
</style></head><body>
<header><div>${logo}</div><nav><a href="#servicios">Tratamientos</a><a href="#sobre">Nosotros</a><a href="#cita">Cita</a></nav></header>
${hero}
<section class="s" id="servicios"><h2>Tratamientos</h2><div class="grid">${servicios}</div></section>
<section class="s alt-bg" id="sobre"><h2>Sobre ${esc(neg.nombre)}</h2><p style="max-width:44em;margin-bottom:40px">${esc(t.sobre)}</p><div class="grid por">${porque}</div><div class="galeria">${galeria}</div></section>
<section class="s" id="cita"><h2>${esc(t.cta)}</h2><a class="btn" href="#">Reservar cita online</a>${tel}</section>
<footer>Propuesta de rediseño preparada por Strauss Digital · Maqueta no oficial basada en la identidad pública de ${esc(neg.nombre)}</footer>
<script>document.documentElement.classList.add('js');var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -60px'});document.querySelectorAll('.rv,section.s h2,.por div,.galeria img').forEach(function(el){el.classList.add('rv');io.observe(el)})</script>
</body></html>`;
}
