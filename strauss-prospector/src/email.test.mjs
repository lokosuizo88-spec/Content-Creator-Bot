import test from 'node:test';
import assert from 'node:assert/strict';
import { redactarEmail } from './email.mjs';

test('email: no llama widget a un enlace de WhatsApp', () => {
  const neg = { nombre: 'Clínica de prueba', nota: 4.8, resenas: 100, web: 'https://example.test' };
  const audit = { flags: ['un_idioma'], info: { chatbot: 'WhatsApp (widget)' } };
  const email = redactarEmail(neg, audit, '');
  assert.match(email, /enlace o integración de WhatsApp/);
  assert.doesNotMatch(email, /WhatsApp \(widget\)/);
});
