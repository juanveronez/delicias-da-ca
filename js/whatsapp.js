export const NUMERO_WHATSAPP = '5519996851415';

export const MENSAGEM_GERAL =
  'Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.';

const formatadorReal = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// O Intl separa "R$" do número com um espaço sem quebra (U+00A0).
// Trocamos por espaço comum para o texto ficar igual em tela e no WhatsApp.
export function formatarPreco(valor) {
  return formatadorReal.format(valor).replace(/\u00a0/g, ' ');
}

export function mensagemBolo(bolo) {
  return `Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de ${bolo.nome} (${formatarPreco(bolo.preco)}).`;
}

export function linkWhatsApp(mensagem) {
  return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

export function linkBolo(bolo) {
  return linkWhatsApp(mensagemBolo(bolo));
}

export const LINK_GERAL = linkWhatsApp(MENSAGEM_GERAL);
