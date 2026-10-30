export const WHATSAPP_NUMBER = '5519996851415';

export const GENERAL_MESSAGE = 'Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// Intl separates "R$" from the number with a no-break space (U+00A0), and
// other ICU versions may use U+202F. Normalize every whitespace character to
// a plain space so the text reads the same on screen and in WhatsApp.
export function formatPrice(value) {
  return brlFormatter.format(value).replace(/\s/g, ' ');
}

export function cakeMessage(cake) {
  return `Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de ${cake.name} (${formatPrice(cake.price)}).`;
}

export function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function cakeLink(cake) {
  return whatsappLink(cakeMessage(cake));
}

export const GENERAL_LINK = whatsappLink(GENERAL_MESSAGE);
