import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WHATSAPP_NUMBER,
  GENERAL_MESSAGE,
  GENERAL_LINK,
  formatPrice,
  cakeMessage,
  whatsappLink,
  cakeLink,
} from '../js/whatsapp.js';

test('formatPrice shows reais with a comma and two decimals', () => {
  assert.equal(formatPrice(50), 'R$ 50,00');
  assert.equal(formatPrice(30), 'R$ 30,00');
  assert.equal(formatPrice(32.5), 'R$ 32,50');
});

test('formatPrice has no whitespace other than a plain space', () => {
  assert.ok(!/[^\S ]/.test(formatPrice(50)));
});

test('cakeMessage mentions the cake name and price', () => {
  const message = cakeMessage({ name: 'Cenoura vulcão', price: 50 });
  assert.equal(
    message,
    'Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de Cenoura vulcão (R$ 50,00).',
  );
});

test('whatsappLink points to the number with country code and area code', () => {
  assert.equal(WHATSAPP_NUMBER, '5519996851415');
  const url = new URL(whatsappLink('oi'));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/5519996851415');
});

test('whatsappLink encodes accents, spaces and symbols without losing anything', () => {
  const message = 'A&B #1 100% +extra 😀 (R$ 50,00)? Paçoca vulcão';
  const link = whatsappLink(message);
  assert.ok(!/\s/.test(link), 'the link must not contain whitespace');
  assert.ok(!link.includes('+'));
  assert.equal(new URL(link).searchParams.get('text'), message);
});

test('cakeLink opens WhatsApp with the message for that cake', () => {
  const cake = { name: 'Paçoca vulcão', price: 50 };
  const url = new URL(cakeLink(cake));
  assert.equal(url.searchParams.get('text'), cakeMessage(cake));
});

test('GENERAL_LINK uses the general message, without a cake name', () => {
  assert.equal(
    GENERAL_MESSAGE,
    'Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.',
  );
  assert.equal(new URL(GENERAL_LINK).searchParams.get('text'), GENERAL_MESSAGE);
});
