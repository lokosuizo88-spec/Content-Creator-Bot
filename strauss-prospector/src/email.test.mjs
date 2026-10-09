import test from 'node:test';
import assert from 'node:assert/strict';
import { redactarEmail } from './email.mjs';
import { PROBLEMAS } from './audit.mjs';

test('email: no llama widget a un enlace de WhatsApp', () => {
  const neg = { nombre: 'Clínica de prueba', nota: 4.8, resenas: 100, web: 'https://example.test' };
  const audit = { flags: ['un_idioma'], info: { chatbot: 'WhatsApp (widget)' } };
  const email = redactarEmail(neg, audit, '');
  assert.match(email, /enlace o integración de WhatsApp/);
  assert.doesNotMatch(email, /WhatsApp \(widget\)/);
});

test('email: quita el punto final del nombre en asunto y saludo', () => {
  const email = redactarEmail({ nombre: 'Clínica Ejemplo. ', nota: 4.8, resenas: 100, web: 'https://example.test' }, { flags: ['sin_reserva'], info: {} }, '');
  assert.match(email, /^Asunto: He revisado la web de Clínica Ejemplo\n/);
  assert.match(email, /Hola, equipo de Clínica Ejemplo:/);
});

test('email: sin demo no promete una demo y los textos tratan de vosotros', () => {
  const neg = { nombre: 'Clínica de prueba', nota: 4.8, resenas: 100, web: 'https://example.test' };
  const todos = Object.keys(PROBLEMAS);
  for (let i = 0; i < todos.length; i += 4) {
    const email = redactarEmail(neg, { flags: todos.slice(i, i + 4), info: {} }, '');
    assert.doesNotMatch(email, /(^|[^\p{L}])(demo|maqueta)(?=$|[^\p{L}])/iu, `promete una demo sin haberla: ${todos.slice(i, i + 4)}`);
  }
  for (const [id, { problema, solucion }] of Object.entries(PROBLEMAS)) {
    assert.doesNotMatch(`${problema} ${solucion}`, /(^|[^\p{L}])(tu|tus|te|tienes|tú)(?=$|[^\p{L}])/iu, `${id} trata de tú`);
  }
});
