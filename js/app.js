import { formatPrice, cakeLink } from './whatsapp.js';

const MENU_URL = 'data/menu.json';
const PHOTOS_DIR = 'img/';

const list = document.getElementById('menu-list');
const notice = document.getElementById('menu-notice');

function createPhoto(cake) {
  const frame = document.createElement('div');
  frame.className = 'cake__photo';

  const photo = document.createElement('img');
  // Without a photo, the brown block of the frame keeps showing.
  photo.addEventListener('error', () => photo.remove());
  photo.src = PHOTOS_DIR + cake.photo;
  photo.alt = `Bolo de ${cake.name}`;
  photo.loading = 'lazy';

  frame.append(photo);
  return frame;
}

function createDetails(cake) {
  const details = document.createElement('div');
  details.className = 'cake__details';

  const name = document.createElement('h3');
  name.className = 'cake__name';
  name.textContent = cake.name;

  const price = document.createElement('p');
  price.className = 'cake__price';
  price.textContent = formatPrice(cake.price);

  const button = document.createElement('a');
  button.className = 'button';
  button.href = cakeLink(cake);
  button.target = '_blank';
  button.rel = 'noopener noreferrer';
  button.textContent = 'Pedir pelo WhatsApp';
  button.setAttribute('aria-label', `Pedir pelo WhatsApp: ${cake.name}`);

  details.append(name, price, button);
  return details;
}

function createCard(cake) {
  const card = document.createElement('li');
  card.className = 'cake';
  card.append(createPhoto(cake), createDetails(cake));
  return card;
}

async function init() {
  try {
    const response = await fetch(MENU_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const cakes = await response.json();
    if (!Array.isArray(cakes) || cakes.length === 0) {
      throw new Error('empty menu');
    }
    list.replaceChildren(...cakes.map(createCard));
  } catch (error) {
    console.error('Could not load the menu:', error);
    list.replaceChildren();
    notice.hidden = false;
  }
}

init();
