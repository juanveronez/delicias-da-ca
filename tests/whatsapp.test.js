import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NUMERO_WHATSAPP,
  MENSAGEM_GERAL,
  LINK_GERAL,
  formatarPreco,
  mensagemBolo,
  linkWhatsApp,
  linkBolo,
} from '../js/whatsapp.js';

test('formatarPreco mostra reais com vírgula e duas casas', () => {
  assert.equal(formatarPreco(50), 'R$ 50,00');
  assert.equal(formatarPreco(30), 'R$ 30,00');
  assert.equal(formatarPreco(32.5), 'R$ 32,50');
});

test('formatarPreco usa espaço comum, não espaço sem quebra', () => {
  assert.ok(!formatarPreco(50).includes('\u00a0'));
});

test('mensagemBolo cita o nome e o preço do bolo', () => {
  const mensagem = mensagemBolo({ nome: 'Cenoura vulcão', preco: 50 });
  assert.equal(
    mensagem,
    'Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de Cenoura vulcão (R$ 50,00).',
  );
});

test('linkWhatsApp aponta para o número com código do país e DDD', () => {
  assert.equal(NUMERO_WHATSAPP, '5519996851415');
  const url = new URL(linkWhatsApp('oi'));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/5519996851415');
});

test('linkWhatsApp codifica acentos, espaços e símbolos sem perder nada', () => {
  const mensagem = 'Paçoca vulcão (R$ 50,00) & mais?';
  const link = linkWhatsApp(mensagem);
  assert.ok(!/\s/.test(link), 'o link não pode ter espaços');
  assert.equal(new URL(link).searchParams.get('text'), mensagem);
});

test('linkBolo abre o WhatsApp com a mensagem daquele bolo', () => {
  const bolo = { nome: 'Paçoca vulcão', preco: 50 };
  const url = new URL(linkBolo(bolo));
  assert.equal(url.searchParams.get('text'), mensagemBolo(bolo));
});

test('LINK_GERAL usa a mensagem geral, sem nome de bolo', () => {
  assert.equal(
    MENSAGEM_GERAL,
    'Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.',
  );
  assert.equal(new URL(LINK_GERAL).searchParams.get('text'), MENSAGEM_GERAL);
});
