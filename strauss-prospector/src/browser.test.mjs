import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { paginaRenderizada, extraerMarca } from './brand.mjs';
import { renderDemo } from './demo.mjs';

const hasBrowser=existsSync(chromium.executablePath());

test('Playwright: Chromium está instalado', {skip:!hasBrowser && 'Instala Chromium con npx playwright install chromium'}, async()=>{
  const browser=await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  await browser.close();
});

test('navegación: extrae una web oscura y no espera a network-idle', {skip:!hasBrowser && 'Instala Chromium con npx playwright install chromium'}, async(t)=>{
  const server=createServer((req,res)=>{
    if(req.url==='/poll') return;
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html style="background-color:rgba(0,0,0,0)"><head><title>Web de prueba</title></head><body style="background-color:rgb(18,18,18);font-family:Inter"><h1>Centro de prueba</h1><p>Información real suficiente</p><script>setInterval(()=>fetch('/poll').catch(()=>{}),30);setTimeout(()=>document.body.insertAdjacentHTML('beforeend','<p>Reserva cargada tras iniciar la web</p>'),250)</script></body></html>`);
  });
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();});
  const url=`http://127.0.0.1:${server.address().port}/`;
  const rendered=await paginaRenderizada(url);
  assert.equal(rendered.ok,true);
  assert.match(rendered.html,/Centro de prueba/);
  assert.match(rendered.html,/Reserva cargada tras iniciar la web/);
  const brand=await extraerMarca(url);
  assert.equal(brand.oscuro,true);
  assert.equal(brand.titulo,'Web de prueba');
});

test('demos: composiciones seleccionadas no desbordan un móvil de 320 px', {skip:!hasBrowser && 'Instala Chromium con npx playwright install chromium'}, async(t)=>{
  const browser=await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  const page=await browser.newPage({viewport:{width:320,height:800}});
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());
  const business={nombre:'Clínica de prueba',web:'https://example.test',direccion:'Palma',nota:4.8,resenas:100,telefono:'971 123 456'};
  const brand={colores:['#123456','#abcdef'],fotos:[],logo:null,fuenteTitulo:'Inter',fuenteCuerpo:'Inter',oscuro:false,radio:12,mayus:false};
  const copy={eslogan:'Cuidado cercano',hero:'Descripción real del centro.',cta:'Pedir cita',servicios:Array.from({length:6},(_,i)=>({titulo:`Servicio ${i}`,texto:'Descripción del servicio'})),por_que:[{titulo:'Atención',texto:'Personal cualificado'}],sobre:'Información comprobada del centro.'};
  try {
    for(let i=0;i<60;i++) {
      await page.setContent(renderDemo(business,brand,copy,i),{waitUntil:'domcontentloaded'});
      const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(dimensions.scroll<=dimensions.width,`layout ${i} desborda: ${JSON.stringify(dimensions)}`);
    }
  } finally { await browser.close(); }
});
