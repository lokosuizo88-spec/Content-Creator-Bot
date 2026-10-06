import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDemo, validarTextos } from './demo.mjs';
import { uniqueSlugs } from './util.mjs';

const business = { nombre:'Clínica de prueba', web:'https://example.test', direccion:'Palma', nota:4.8, resenas:100, telefono:'971 123 456' };
const brand = { colores:['#123456','#abcdef'], fotos:[], logo:null, fuenteTitulo:'Inter', fuenteCuerpo:'Inter', oscuro:false, radio:12, mayus:false, textos:[], titulo:'Prueba', descripcion:'' };
const copy = { eslogan:'Cuidado cercano', hero:'Descripción real del centro.', cta:'Pedir cita', servicios:[{titulo:'Servicio real',texto:'Descripción real.'}], por_que:[{titulo:'Atención',texto:'Personal cualificado.'}], sobre:'Información comprobada del centro.' };

test('Gemini: rechaza respuestas incompletas antes de renderizar', () => {
  assert.throws(() => validarTextos({...copy, servicios:null}), /JSON incompleto/);
  assert.throws(() => validarTextos({...copy, servicios:[null]}), /servicios con elementos incompletos/);
  assert.equal(validarTextos(copy), copy);
});

test('composición: enlaces de reserva accionables o marcados como pendientes', () => {
  const withPhone = renderDemo(business, brand, copy);
  const withoutPhone = renderDemo({...business, telefono:null}, brand, copy);
  assert.match(withPhone, /href="tel:971123456">Llamar para pedir cita/);
  assert.match(withoutPhone, /Enlace de reserva pendiente de configurar/);
  assert.doesNotMatch(withPhone + withoutPhone, /Reservar cita online|href="#">/);
});

test('composición: layouts mantienen fallback de animación y hover tras reveal', () => {
  const html = renderDemo(business, brand, copy);
  assert.match(html, /IntersectionObserver'in window/);
  assert.match(html, /nodes\.forEach\(function\(el\)\{el\.classList\.add\('in'\)\}\)/);
  assert.match(html, /\.js \.rv\.in\.card:hover/);
  assert.match(html, /minmax\(min\(340px,100%\),1fr\)/);
});

test('identificadores: nombres equivalentes se distinguen al generar un lote', () => {
  assert.deepEqual(uniqueSlugs(['Clínica Á','Clinica A','!!!']),['clinica-a','clinica-a-2','negocio']);
});
