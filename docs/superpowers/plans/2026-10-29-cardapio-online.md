# Cardápio online Delicias da Cá — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar um site estático de cardápio de bolos caseiros em que cada bolo tem um botão que abre o WhatsApp da Delicias da Cá com a mensagem do pedido já escrita.

**Architecture:** Página única (`index.html`) em HTML, CSS e JavaScript puros, sem build. Os bolos vêm de `data/menu.json`; `js/app.js` busca o JSON e monta os cards com `textContent`. A lógica que não pode quebrar (link do WhatsApp e formatação de preço) fica em `js/whatsapp.js`, um módulo ES de funções puras, testado com o executor nativo do Node (`node --test`).

**Tech Stack:** HTML5, CSS3, JavaScript (módulos ES), Node 22 (`node:test`, sem dependências), `python3 -m http.server` para ver o site localmente, `cwebp` (Homebrew `webp`) para converter fotos.

**Spec:** `docs/superpowers/specs/2026-10-29-cardapio-online-design.md`

---

## Convenções de código

- Todo o código fica em inglês: identificadores (variáveis, funções e constantes), comentários, descrições e mensagens dos testes, nomes de arquivo, chaves do JSON, ids do HTML, classes e propriedades personalizadas do CSS e mensagens de console.
- Só fica em português o que o usuário final vê: os textos, títulos e rótulos da página, a mensagem do WhatsApp, os atributos `alt` e `aria-label`, o `<title>`, a meta description e as tags Open Graph, os avisos e o `name` de cada bolo.
- Exceção deliberada: os valores de `id` dos bolos (por exemplo, `cenoura-vulcao`) e os nomes das fotos derivados deles (`cenoura-vulcao.webp`) seguem o nome do produto, em português. O mesmo vale para `lang="pt-BR"` e `Intl.NumberFormat('pt-BR', ...)`.
- A documentação (README, spec e plano) continua em português, mas todo identificador, caminho, classe ou chave citado nela usa os nomes em inglês.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json` | Só `{"type":"module"}` e o script `test`. Sem dependências. |
| `.gitignore` | Ignora `.superpowers/`, os prints de referência, `.DS_Store`. |
| `js/whatsapp.js` | Funções puras: formatar preço, montar mensagem e link do WhatsApp. Sem DOM. |
| `data/menu.json` | Os 18 bolos, na ordem de exibição. Só dados. |
| `index.html` | Estrutura da página, textos fixos, meta tags, botão geral e aviso de erro. |
| `css/style.css` | Estilo A (rústico artesanal), mobile first. |
| `js/app.js` | Busca o JSON, monta os cards, trata erro. Usa o DOM. |
| `tests/whatsapp.test.js` | Testa `js/whatsapp.js`. |
| `tests/menu.test.js` | Valida `data/menu.json`. |
| `tests/index.test.js` | Garante que os links e meta tags do `index.html` estão corretos. |
| `tests/app.test.js` | Garante que `js/app.js` não injeta HTML e usa `rel` seguro. |
| `tests/photos.test.js` | (Task 8) Garante que cada foto existe, é WebP e é leve. |
| `img/` | Fotos otimizadas (Task 8). |
| `README.md` | Como editar o cardápio, rodar, testar e publicar. |

## Regras gerais deste plano

- Rodar os testes: `npm test` (equivale a `node --test tests/*.test.js`).
- Nenhuma dependência npm. Não rodar `npm install`.
- Se o sandbox do Apple Claude Code bloquear a abertura de porta (`EPERM on listen`) na Task 7, **não** altere allowlists nem o sandbox. Peça ao usuário para rodar `python3 -m http.server 8000` num terminal dele.
- Os dois prints na raiz (`Screenshot ...png`) são do usuário. Não apague nem mova sem pedir.

---

### Task 1: Branch e estrutura básica

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Add (já existem): `docs/superpowers/specs/2026-10-29-cardapio-online-design.md`, `docs/superpowers/plans/2026-10-29-cardapio-online.md`

- [ ] **Step 1: Criar a branch de trabalho**

Run: `git switch -c feat/cardapio-online`
Expected: `Switched to a new branch 'feat/cardapio-online'`

- [ ] **Step 2: Criar `.gitignore`**

```gitignore
.superpowers/
Screenshot *.png
.DS_Store
node_modules/
```

- [ ] **Step 3: Criar `package.json`**

```json
{
  "name": "delicias-da-ca",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.js"
  }
}
```

- [ ] **Step 4: Conferir que os prints saíram do `git status`**

Run: `git status --short`
Expected: aparecem `.gitignore`, `package.json` e `docs/`. **Não** aparecem `Screenshot ...png` nem `.superpowers/`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json docs/
git commit -m "chore: estrutura inicial, spec e plano do cardápio online"
```

---

### Task 2: Link do WhatsApp e preço (`js/whatsapp.js`)

**Files:**
- Create: `tests/whatsapp.test.js`
- Create: `js/whatsapp.js`

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/whatsapp.test.js`:

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL com `ERR_MODULE_NOT_FOUND` apontando para `js/whatsapp.js`.

- [ ] **Step 3: Implementar**

Criar `js/whatsapp.js`:

```js
export const WHATSAPP_NUMBER = '5519996851415';

export const GENERAL_MESSAGE =
  'Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.';

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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ pass 7` e `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/whatsapp.js tests/whatsapp.test.js
git commit -m "feat: link do WhatsApp e formatação de preço"
```

---

### Task 3: Dados do cardápio (`data/menu.json`)

**Files:**
- Create: `tests/menu.test.js`
- Create: `data/menu.json`

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/menu.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load() {
  const text = await readFile(new URL('../data/menu.json', import.meta.url), 'utf8');
  return JSON.parse(text);
}

test('menu.json is valid JSON containing a list', async () => {
  const cakes = await load();
  assert.ok(Array.isArray(cakes));
});

// Update this number when you add or remove a flavor on purpose.
const EXPECTED_COUNT = 18;

test('menu.json has the expected number of cakes', async () => {
  const cakes = await load();
  assert.equal(
    cakes.length,
    EXPECTED_COUNT,
    `found ${cakes.length} cakes, expected ${EXPECTED_COUNT}. If you added or removed a flavor on purpose, update EXPECTED_COUNT in tests/menu.test.js`,
  );
});

test('every cake has a valid id, name, price and photo named after its id', async () => {
  const cakes = await load();
  for (const cake of cakes) {
    assert.match(cake.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `invalid id: ${cake.id}`);
    assert.equal(typeof cake.name, 'string', `invalid name in ${cake.id}`);
    assert.ok(cake.name.trim().length > 0, `empty name in ${cake.id}`);
    assert.equal(typeof cake.price, 'number', `invalid price in ${cake.id}`);
    assert.ok(Number.isFinite(cake.price) && cake.price > 0, `price must be > 0 in ${cake.id}`);
    assert.equal(cake.photo, `${cake.id}.webp`, `photo must be ${cake.id}.webp in ${cake.id}`);
  }
});

test('ids are unique', async () => {
  const cakes = await load();
  const ids = cakes.map((cake) => cake.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], `duplicate ids: ${duplicates.join(', ')}`);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: os testes de `menu.test.js` falham com `ENOENT` para `data/menu.json`. Os de `whatsapp.test.js` continuam passando.

- [ ] **Step 3: Criar o JSON**

Criar `data/menu.json` (preços do cardápio atual, na mesma ordem dele):

```json
[
  { "id": "banana", "name": "Banana", "price": 35, "photo": "banana.webp" },
  { "id": "cenoura", "name": "Cenoura", "price": 30, "photo": "cenoura.webp" },
  { "id": "cenoura-brigadeiro", "name": "Cenoura com cobertura de brigadeiro", "price": 40, "photo": "cenoura-brigadeiro.webp" },
  { "id": "cenoura-chocolate", "name": "Cenoura com cobertura de chocolate", "price": 35, "photo": "cenoura-chocolate.webp" },
  { "id": "cenoura-vulcao", "name": "Cenoura vulcão", "price": 50, "photo": "cenoura-vulcao.webp" },
  { "id": "chocolate", "name": "Chocolate", "price": 30, "photo": "chocolate.webp" },
  { "id": "chocolate-brigadeiro", "name": "Chocolate com cobertura de brigadeiro", "price": 40, "photo": "chocolate-brigadeiro.webp" },
  { "id": "chocolate-chocolate", "name": "Chocolate com cobertura de chocolate", "price": 35, "photo": "chocolate-chocolate.webp" },
  { "id": "fuba", "name": "Fubá", "price": 30, "photo": "fuba.webp" },
  { "id": "fuba-goiabada", "name": "Fubá com goiabada", "price": 35, "photo": "fuba-goiabada.webp" },
  { "id": "fuba-cremoso", "name": "Fubá cremoso", "price": 40, "photo": "fuba-cremoso.webp" },
  { "id": "laranja", "name": "Laranja", "price": 30, "photo": "laranja.webp" },
  { "id": "limao", "name": "Limão", "price": 40, "photo": "limao.webp" },
  { "id": "milho", "name": "Milho", "price": 35, "photo": "milho.webp" },
  { "id": "ninho-cobertura", "name": "Ninho com cobertura", "price": 40, "photo": "ninho-cobertura.webp" },
  { "id": "ninho-vulcao", "name": "Ninho vulcão", "price": 50, "photo": "ninho-vulcao.webp" },
  { "id": "pacoca", "name": "Paçoca", "price": 40, "photo": "pacoca.webp" },
  { "id": "pacoca-vulcao", "name": "Paçoca vulcão", "price": 50, "photo": "pacoca-vulcao.webp" }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Conferir nomes e preços contra o cardápio original**

Abrir a imagem do cardápio (o print `Screenshot 2026-10-29 at 16.20.55.png`) ao lado de `data/menu.json` e conferir, linha a linha, nome e preço dos 18 sabores. Os testes não pegam um preço digitado errado. Se algo estiver diferente, corrigir o JSON e rodar `npm test` de novo.

- [ ] **Step 6: Commit**

```bash
git add data/menu.json tests/menu.test.js
git commit -m "feat: dados dos 18 bolos do cardápio"
```

---

### Task 4: Estrutura da página (`index.html`)

**Files:**
- Create: `tests/index.test.js`
- Create: `index.html`

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/index.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GENERAL_LINK } from '../js/whatsapp.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('every WhatsApp link in index.html is the general link', () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(links.length >= 2, 'expected at least the hero button and the footer link');
  for (const link of links) {
    assert.equal(link, GENERAL_LINK);
  }
});

test('links that open in a new tab use a safe rel', () => {
  const opened = [...html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
  assert.ok(opened.length > 0);
  for (const tag of opened) {
    assert.match(tag, /rel="noopener noreferrer"/);
  }
});

test('index.html has a title, description and preview tags', () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<meta property="og:title" content="[^"]+">/);
  assert.match(html, /<meta property="og:description" content="[^"]+">/);
});

test('index.html has the menu mount point and the error notice', () => {
  assert.match(html, /id="menu-list"/);
  assert.match(html, /id="menu-notice"/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `tests/index.test.js` falha com `ENOENT` para `index.html`.

- [ ] **Step 3: Criar `index.html`**

O endereço do WhatsApp aparece como `https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda.` em quatro lugares. Ele precisa ser idêntico ao `GENERAL_LINK` (o teste confere). O link está escrito direto no HTML porque o botão do topo precisa funcionar mesmo sem JavaScript.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Delicias da Cá · Bolos caseiros em Campinas</title>
  <meta name="description" content="Bolos caseiros em Campinas/SP, com entrega. Veja o cardápio e faça sua encomenda pelo WhatsApp.">
  <meta name="theme-color" content="#4a2c1a">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="Delicias da Cá · Bolos caseiros em Campinas">
  <meta property="og:description" content="Bolos caseiros com entrega em Campinas/SP. Veja o cardápio e peça pelo WhatsApp.">
  <link rel="stylesheet" href="css/style.css">
  <script type="module" src="js/app.js"></script>
</head>
<body>
  <header class="hero">
    <div class="container">
      <h1 class="hero__brand">Delicias da Cá</h1>
      <p class="hero__tagline">Bolos caseiros, feitos com carinho</p>
      <div class="hero__photo">
        <img src="img/hero.webp" alt="Bolos caseiros da Delicias da Cá" onerror="this.remove()">
      </div>
      <a class="button button--large" href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">Fazer encomenda no WhatsApp</a>
    </div>
  </header>

  <main>
    <section class="notices" aria-label="Entrega e horários">
      <div class="container">
        <p><strong>Entregamos em Campinas.</strong> A taxa é combinada pelo WhatsApp.</p>
        <p><strong>Segunda a quarta:</strong> encomendas somente no período da manhã.</p>
        <p><strong>Quinta a domingo:</strong> pronta entrega, encomendas e entregas o dia todo.</p>
      </div>
    </section>

    <section class="menu" aria-labelledby="menu-title">
      <div class="container">
        <h2 id="menu-title" class="section-title">Cardápio</h2>
        <ul id="menu-list" class="menu__list"></ul>
        <div id="menu-notice" class="error-notice" hidden>
          <p>Não conseguimos mostrar o cardápio agora. Chame a Cá no WhatsApp e ela te passa os sabores e os preços.</p>
          <a class="button" href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">Falar com a Cá no WhatsApp</a>
        </div>
        <noscript>
          <div class="error-notice">
            <p>Para ver o cardápio, ative o JavaScript do navegador. Ou chame a Cá no WhatsApp e ela te passa os sabores e os preços.</p>
            <a class="button" href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">Falar com a Cá no WhatsApp</a>
          </div>
        </noscript>
      </div>
    </section>

    <section class="how-to-order" aria-labelledby="how-to-order-title">
      <div class="container">
        <h2 id="how-to-order-title" class="section-title">Como pedir</h2>
        <ol>
          <li>Escolha o seu bolo.</li>
          <li>Toque em “Pedir pelo WhatsApp”.</li>
          <li>Combine data, horário e entrega com a Cá.</li>
        </ol>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>Delicias da Cá · Campinas/SP</p>
      <p>WhatsApp: <a href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">(19) 99685-1415</a></p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`. Se o primeiro teste de `index.test.js` falhar, o link colado no HTML difere do `GENERAL_LINK`: rode `node -e "import('./js/whatsapp.js').then(m => console.log(m.GENERAL_LINK))"` e copie a saída exatamente.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/index.test.js
git commit -m "feat: estrutura da página com topo, avisos, cardápio e rodapé"
```

---

### Task 5: Estilo A, rústico artesanal (`css/style.css`)

**Files:**
- Create: `css/style.css`

CSS não tem teste automatizado. A conferência visual é a Task 7.

- [ ] **Step 1: Criar `css/style.css`**

O verde do botão é `#3f6f2a` (cerca de 6:1 com texto branco), mais escuro que o do mockup, para passar dos 4,5:1 de contraste.

```css
:root {
  --cream: #f4e9d3;
  --cream-dark: #efdfc0;
  --paper: #fffaf0;
  --brown: #4a2c1a;
  --brown-light: #7a4a22;
  --border: #b48a5a;
  --green: #3f6f2a;
  --green-dark: #2f5520;
  --empty-photo: linear-gradient(135deg, #d9a35f, #a8683a);
  --font-script: 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive;
  --font-body: Georgia, 'Times New Roman', serif;
  --font-button: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--cream);
  color: var(--brown);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.5;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* WhatsApp button (used in the hero, in the cards and in the notices) */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.5rem 1rem;
  background: var(--green);
  color: #fff;
  font-family: var(--font-button);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  border-radius: 4px;
}

.button:hover {
  background: var(--green-dark);
}

.button:focus-visible,
.site-footer a:focus-visible {
  outline: 3px solid var(--brown);
  outline-offset: 2px;
}

.button--large {
  font-size: 1.05rem;
  padding: 0.65rem 1.25rem;
}

/* Hero */
.hero {
  background: var(--cream-dark);
  border-bottom: 3px double var(--border);
  padding: 1.25rem 0 1.5rem;
  text-align: center;
}

.hero__brand {
  margin: 0;
  font-family: var(--font-script);
  font-size: 2.75rem;
  font-weight: 400;
  line-height: 1.15;
}

.hero__tagline {
  margin: 0.25rem 0 1rem;
}

.hero__photo {
  max-width: 560px;
  aspect-ratio: 4 / 3;
  margin: 0 auto 1rem;
  background: var(--empty-photo);
  border-radius: 8px;
  overflow: hidden;
}

.hero__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Delivery and opening-hours notices */
.notices {
  padding: 1rem 0;
  border-bottom: 1px dashed var(--border);
}

.notices p {
  margin: 0.35rem 0;
}

/* Section titles */
.section-title {
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border);
  font-size: 1.35rem;
  text-align: center;
}

.menu,
.how-to-order {
  padding: 1.5rem 0;
}

/* Menu */
.menu__list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cake {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--paper);
  border: 2px solid var(--border);
  border-radius: 6px;
}

.cake__photo {
  flex: none;
  width: 112px;
  height: 112px;
  background: var(--empty-photo);
  border-radius: 4px;
  overflow: hidden;
}

.cake__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cake__details {
  flex: 1;
  min-width: 0;
}

.cake__name {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.25;
}

.cake__price {
  margin: 0.15rem 0 0.5rem;
  color: var(--brown-light);
  font-weight: 700;
  white-space: nowrap;
}

/* Notice shown when the menu fails to load */
.error-notice {
  padding: 1rem;
  background: var(--paper);
  border: 2px solid var(--border);
  border-radius: 6px;
  text-align: center;
}

/* How to order */
.how-to-order ol {
  max-width: 420px;
  margin: 0 auto;
  padding-left: 1.5rem;
}

.how-to-order li {
  margin: 0.4rem 0;
}

/* Footer */
.site-footer {
  padding: 1.25rem 0;
  background: var(--cream-dark);
  border-top: 3px double var(--border);
  text-align: center;
  font-size: 0.9rem;
}

.site-footer p {
  margin: 0.25rem 0;
}

.site-footer a {
  color: var(--brown);
  font-weight: 700;
}

/* Larger screens: more menu columns */
@media (min-width: 640px) {
  .menu__list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .menu__list {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

- [ ] **Step 2: Conferir que os testes continuam verdes**

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: estilo rústico artesanal, mobile first"
```

---

### Task 6: Montagem dos cards (`js/app.js`)

**Files:**
- Create: `tests/app.test.js`
- Create: `js/app.js`

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/app.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('app.js never injects HTML', () => {
  for (const forbidden of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write']) {
    assert.ok(!code.includes(forbidden), `${forbidden} must not appear in app.js`);
  }
});

test('app.js opens WhatsApp links with a safe rel', () => {
  assert.match(code, /\.rel\s*=\s*'noopener noreferrer'/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `tests/app.test.js` falha com `ENOENT` para `js/app.js`.

- [ ] **Step 3: Implementar**

Criar `js/app.js`:

```js
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
  button.setAttribute('aria-label', `Pedir ${cake.name} pelo WhatsApp`);

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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/app.js tests/app.test.js
git commit -m "feat: monta os cards do cardápio a partir do JSON"
```

---

### Task 7: Conferência no navegador

**Files:** nenhum arquivo novo. Se algo estiver errado, corrigir o arquivo responsável e commitar a correção.

- [ ] **Step 1: Subir o servidor local**

Run (na raiz do projeto): `python3 -m http.server 8000`
Expected: `Serving HTTP on :: port 8000`.

Se o sandbox bloquear com `EPERM on listen`, não mexa em allowlist nem em sandbox. Peça ao usuário para rodar o mesmo comando num terminal dele (ou com `! python3 -m http.server 8000`) e seguir daí.

- [ ] **Step 2: Abrir `http://localhost:8000` em tamanho de celular**

No Chrome: DevTools (⌥⌘I) → ícone de dispositivo (⇧⌘M) → iPhone 12 Pro (390px).

Conferir:
- [ ] O nome "Delicias da Cá" aparece em letra manuscrita, em cima do fundo creme.
- [ ] O topo mostra um bloco marrom no lugar da foto (as fotos chegam na Task 8) e o botão verde "Fazer encomenda no WhatsApp".
- [ ] Os avisos de entrega e horários aparecem.
- [ ] Existem 18 cards, na ordem do cardápio original, cada um com bloco marrom, nome, preço e botão. Nenhum ícone de imagem quebrada.
- [ ] Os nomes longos ("Chocolate com cobertura de brigadeiro") quebram em linhas sem estourar o card.
- [ ] Não há rolagem horizontal.

- [ ] **Step 3: Conferir os botões**

- [ ] Clicar em "Pedir pelo WhatsApp" do card "Paçoca vulcão". Abre o WhatsApp (web ou app) com a mensagem `Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de Paçoca vulcão (R$ 50,00).` e o número (19) 99685-1415. Não enviar a mensagem.
- [ ] Clicar no botão do topo. A mensagem é `Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.`

- [ ] **Step 4: Conferir telas maiores**

Deixar a janela em 700px e depois em 1100px.
- [ ] Com 700px, o cardápio fica em 2 colunas. Com 1100px, em 3 colunas.

- [ ] **Step 5: Conferir as falhas**

- [ ] **JSON ausente:** renomear temporariamente `data/menu.json` para `data/menu.json.bak`, recarregar. Deve aparecer o aviso "Não conseguimos mostrar o cardápio agora..." com o botão do WhatsApp. Depois voltar o nome original.
- [ ] **Sem JavaScript:** DevTools → ⌘⇧P → "Disable JavaScript" → recarregar. Deve aparecer o aviso do `<noscript>` com o botão. O botão do topo continua funcionando. Reativar o JavaScript depois.

- [ ] **Step 6: Rodar os testes e parar o servidor**

Run: `npm test`
Expected: `ℹ fail 0`. Parar o servidor com Ctrl+C.

- [ ] **Step 7: Commit (somente se algo foi corrigido)**

```bash
git add -A
git status --short   # check that only the fixed files were staged
git commit -m "fix: ajustes encontrados na conferência no navegador"
```

---

### Task 8: Fotos dos bolos

**Gate:** só comece quando o usuário tiver entregue as 18 fotos dos bolos e a foto de destaque do topo, cada uma identificada. Sugestão: uma pasta (ex.: `~/Pictures/cake-photos/`) com os arquivos `.jpg` nomeados pelo `id` do bolo, como `cenoura-vulcao.jpg`, e a foto de destaque como `hero.jpg`. Os prints da raiz **não** servem: têm texto sobreposto.

**Files:**
- Create: `tests/photos.test.js`
- Create: `img/hero.webp` e `img/<id>.webp` para os 18 bolos

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/photos.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MAX_BYTES = 200 * 1024;

const cakes = JSON.parse(
  await readFile(new URL('../data/menu.json', import.meta.url), 'utf8'),
);
const files = ['hero.webp', ...cakes.map((cake) => cake.photo)];

for (const file of files) {
  test(`img/${file} exists, is WebP and is small enough`, async () => {
    const bytes = await readFile(new URL(`../img/${file}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', 'not a WebP file');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', 'not a WebP file');
    assert.ok(
      bytes.length <= MAX_BYTES,
      `${file} is ${bytes.length} bytes; the limit is ${MAX_BYTES}`,
    );
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: 19 testes de `photos.test.js` falham com `ENOENT` (as fotos ainda não existem).

- [ ] **Step 3: Instalar o conversor (peça confirmação ao usuário antes)**

O macOS sabe ler WebP mas não gravar. O `cwebp` vem do pacote `webp` do Homebrew.

Run: `command -v cwebp || brew install webp`
Expected: o caminho do `cwebp` ou o fim da instalação.

- [ ] **Step 4: Converter as fotos dos bolos (800px de largura máxima, WebP qualidade 80)**

Ajuste `SRC_DIR` para a pasta com as fotos do usuário.

```bash
SRC_DIR="$HOME/Pictures/cake-photos"
TMP="$(mktemp -d)"
mkdir -p img
for original in "$SRC_DIR"/*.jpg; do
  id="$(basename "$original" .jpg)"
  [ "$id" = "hero" ] && continue
  sips -Z 800 -s format png "$original" --out "$TMP/$id.png" >/dev/null
  cwebp -quiet -q 80 "$TMP/$id.png" -o "img/$id.webp"
done
```

- [ ] **Step 5: Converter a foto de destaque (1200px)**

Rode no mesmo terminal do passo 4: as variáveis `SRC_DIR` e `TMP` precisam existir.

```bash
sips -Z 1200 -s format png "$SRC_DIR/hero.jpg" --out "$TMP/hero.png" >/dev/null
cwebp -quiet -q 80 "$TMP/hero.png" -o img/hero.webp
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`. Se alguma foto passar de 200 KB, refazer a conversão dela com `-q 70`.

- [ ] **Step 7: Conferir no navegador**

Subir o servidor como na Task 7 e conferir:
- [ ] Cada card mostra a foto do bolo certo (comparar com o nome).
- [ ] O topo mostra a foto de destaque.

- [ ] **Step 8: Commit**

```bash
git add img/ tests/photos.test.js
git commit -m "feat: fotos otimizadas dos bolos e teste de tamanho"
```

---

### Task 9: README e publicação

**Gate:** o usuário precisa escolher a hospedagem (GitHub Pages ou Netlify) e dizer se haverá domínio próprio. Os passos 3 e 4 só valem depois disso.

**Files:**
- Modify: `README.md`
- Modify: `index.html` (tags `og:image` e `og:url`, só depois de saber a URL final)

- [ ] **Step 1: Escrever o `README.md`**

Substituir o conteúdo atual por:

````markdown
# Delicias da Cá

Cardápio online de bolos caseiros. Cada bolo tem um botão que abre o WhatsApp com o pedido já escrito. Entregas em Campinas/SP.

Site estático: HTML, CSS e JavaScript puros, sem build e sem dependências.

Convenção de código: tudo o que é código (identificadores, comentários, testes e nomes de arquivo) fica em inglês, e só o texto que o cliente vê (a página, a mensagem do WhatsApp e o nome de cada bolo) fica em português, exceto os `id` dos bolos e os nomes das fotos, que seguem o nome do produto.

## Ver o site no computador

O navegador bloqueia a leitura do `data/menu.json` quando o `index.html` é aberto com duplo clique. Use um servidor local:

```bash
python3 -m http.server 8000
```

Abra http://localhost:8000.

## Mudar um preço ou incluir um sabor

Edite só o `data/menu.json`. Cada bolo é uma linha:

```json
{ "id": "cenoura-vulcao", "name": "Cenoura vulcão", "price": 50, "photo": "cenoura-vulcao.webp" }
```

- `id`: minúsculas, sem acento nem espaço, com hífen entre as palavras. É o nome-base da foto.
- `name`: o que aparece no card e na mensagem do WhatsApp.
- `price`: número em reais, sem o símbolo `R$`.
- `photo`: nome do arquivo dentro de `img/`, sempre o `id` mais `.webp` (`<id>.webp`).

Depois de editar, rode `npm test`. Ele avisa se o JSON está quebrado (por exemplo, uma vírgula sobrando). Se incluir ou tirar um sabor de propósito, o teste `menu.json has the expected number of cakes` vai falhar: troque o número da constante `EXPECTED_COUNT` em `tests/menu.test.js`. Também confira que o campo `photo` é o `id` mais `.webp`.

## Fotos

Uma foto por bolo em `img/<id>.webp`, com até 800px de largura e menos de 200 KB. A foto do topo é `img/hero.webp` (até 1200px). Para converter, instale o `cwebp` (`brew install webp`) e veja a Task 8 do plano em `docs/superpowers/plans/`.

## Testes

```bash
npm test
```

Usa o executor de testes do próprio Node (versão 20 ou mais nova). Não há nada para instalar.

## Publicar

O site é só uma pasta de arquivos. Publique a partir do repositório Git (GitHub Pages ou Netlify ligado ao repositório), não arrastando a pasta do computador, para não enviar arquivos de referência junto.
````

- [ ] **Step 2: Commit do README**

```bash
git add README.md
git commit -m "docs: README com como editar, testar e publicar"
```

- [ ] **Step 3: Definir a URL pública**

Com a hospedagem escolhida, anote a URL final com a barra no fim (por exemplo, a que o GitHub Pages ou o Netlify mostrar para o projeto). Chame de `PUBLIC_URL` nos passos seguintes.

- [ ] **Step 4: Acrescentar `og:url` e `og:image` ao `index.html`**

Dentro do `<head>`, logo depois da linha `<meta property="og:description" ...>`, inserir as duas linhas abaixo, trocando `PUBLIC_URL` pela URL do passo 3:

```html
  <meta property="og:url" content="PUBLIC_URL">
  <meta property="og:image" content="PUBLIC_URLimg/hero.webp">
```

Exemplo de resultado, se `PUBLIC_URL` for `https://exemplo.netlify.app/`:

```html
  <meta property="og:url" content="https://exemplo.netlify.app/">
  <meta property="og:image" content="https://exemplo.netlify.app/img/hero.webp">
```

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 6: Commit e publicar**

```bash
git add index.html
git commit -m "feat: prévia de compartilhamento com og:url e og:image"
```

Publicar conforme a hospedagem escolhida. O merge da branch `feat/cardapio-online` na `main` e o envio ao GitHub só acontecem com o pedido do usuário (usar a skill `superpowers:finishing-a-development-branch`).

- [ ] **Step 7: Conferir o site publicado**

- [ ] Abrir a URL pública no celular, ver os 18 cards com foto e testar um botão de pedido.
- [ ] Enviar o link para si mesmo no WhatsApp e conferir a prévia (título, descrição e foto).
- [ ] Confirmar com a Cá os horários de encomenda e a grafia "Delicias" (pontos em aberto da spec).
