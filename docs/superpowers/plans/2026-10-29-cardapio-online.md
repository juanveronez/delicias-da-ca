# Cardápio online Delicias da Cá — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar um site estático de cardápio de bolos caseiros em que cada bolo tem um botão que abre o WhatsApp da Delicias da Cá com a mensagem do pedido já escrita.

**Architecture:** Página única (`index.html`) em HTML, CSS e JavaScript puros, sem build. Os bolos vêm de `data/menu.json`; `js/app.js` busca o JSON e monta os cards com `textContent`. A lógica que não pode quebrar (link do WhatsApp e formatação de preço) fica em `js/whatsapp.js`, um módulo ES de funções puras, testado com o executor nativo do Node (`node --test`).

**Tech Stack:** HTML5, CSS3, JavaScript (módulos ES), Node 22 (`node:test`, sem dependências), `python3 -m http.server` para ver o site localmente, `sips` (macOS) e `cwebp` (Homebrew `webp`), usados pelo `scripts/prepare-photos.mjs` para converter fotos.

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
| `package.json` | Só `name`, `private`, `type` e o script `test`. Sem dependências. |
| `.gitignore` | Ignora `.superpowers/`, os prints de referência, `.DS_Store`, `node_modules/` e `fotos-originais/` (as fotos enviadas, antes da otimização). |
| `js/whatsapp.js` | Funções puras: formatar preço, montar mensagem e link do WhatsApp. Sem DOM. |
| `data/menu.json` | Os 18 bolos, na ordem de exibição. Só dados. |
| `index.html` | Estrutura da página, textos fixos, meta tags, botão geral e aviso de erro. |
| `css/style.css` | Estilo A (rústico artesanal), mobile first. |
| `favicon.svg` | Ícone da aba do navegador: um cupcake desenhado em SVG (sem arquivos externos). |
| `js/app.js` | Busca o JSON, monta os cards, trata erro. Usa o DOM. |
| `tests/whatsapp.test.js` | Testa `js/whatsapp.js`. |
| `tests/menu.test.js` | Valida `data/menu.json`. |
| `tests/index.test.js` | Garante que os links e meta tags do `index.html` estão corretos. |
| `tests/app.test.js` | Garante que `js/app.js` não injeta HTML e usa `rel` seguro. |
| `tests/photos.test.js` | (Task 8) Garante que cada foto presente em `img/` é citada no `data/menu.json` (ou é `hero.webp`) e passa no `checkWebp` de `scripts/photo-lib.mjs` (WebP íntegro, até 200 KB, sem EXIF nem XMP). Lista os bolos ainda sem foto, sem falhar. |
| `scripts/photo-lib.mjs` | (Task 8) Funções puras do conversor de fotos: decidir se precisa reduzir (nunca amplia), ler BMP, achar tarjas pretas, casar o nome do arquivo com o `id` e validar o WebP. Sem efeitos colaterais. |
| `scripts/prepare-photos.mjs` | (Task 8) O comando `node scripts/prepare-photos.mjs`: converte as fotos de `fotos-originais/` em `img/<id>.webp`. Usa `sips` (macOS) e `cwebp`. |
| `tests/photo-lib.test.js` | (Task 8) Testa `scripts/photo-lib.mjs`. |
| `tests/prepare-photos.test.js` | (Task 8) Testa o comando de ponta a ponta com imagens sintéticas. É pulado quando faltam `sips` ou `cwebp`. |
| `img/` | Fotos otimizadas (Task 8), que podem chegar em lotes. |
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
fotos-originais/
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
- Create: `favicon.svg`

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/index.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { GENERAL_LINK } from '../js/whatsapp.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

// hero button, error notice, noscript fallback and footer
const EXPECTED_WHATSAPP_LINK_COUNT = 4;

test('every WhatsApp link in index.html is the general link', () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]*)"/g)].map((m) => m[1]);
  assert.equal(
    links.length,
    EXPECTED_WHATSAPP_LINK_COUNT,
    `expected ${EXPECTED_WHATSAPP_LINK_COUNT} WhatsApp links (hero, error notice, noscript, footer), found ${links.length}. If you added or removed one on purpose, update EXPECTED_WHATSAPP_LINK_COUNT in tests/index.test.js`,
  );
  for (const link of links) {
    assert.equal(link, GENERAL_LINK);
  }
});

test('links that open in a new tab use a safe rel', () => {
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0]);
  const opened = anchors.filter((tag) => /target\s*=\s*["']?_blank/i.test(tag));
  assert.ok(opened.length > 0);
  for (const tag of opened) {
    const rel = /rel\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
    const tokens = rel.split(/\s+/);
    assert.ok(
      tokens.includes('noopener') && tokens.includes('noreferrer'),
      `missing rel="noopener noreferrer" in: ${tag}`,
    );
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

test('the error notice is hidden by default and the noscript fallback offers WhatsApp', () => {
  // js/app.js reveals the notice with `notice.hidden = false` when the menu fails to load.
  assert.match(html, /<div id="menu-notice"[^>]*\bhidden\b/);
  assert.match(html, /<noscript>[\s\S]*https:\/\/wa\.me\/[\s\S]*<\/noscript>/);
});

test('index.html links a favicon that exists', async () => {
  const href = /<link rel="icon" href="([^"]+)"/.exec(html)?.[1];
  assert.ok(href, 'expected a <link rel="icon" href="..."> in index.html');
  await access(new URL(`../${href}`, import.meta.url));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `tests/index.test.js` falha com `ENOENT` para `index.html`.

- [ ] **Step 3: Criar `index.html` e `favicon.svg`**

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
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
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
        <ul id="menu-list" class="menu__list" role="list"></ul>
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

Criar `favicon.svg` (um cupcake desenhado em SVG, sem arquivos externos nem licença a respeitar; o teste do `<link rel="icon">` confere que o arquivo existe):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g stroke="#4a2c1a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
    <!-- frosting tiers, bottom to top -->
    <rect x="9" y="26" width="46" height="14" rx="7" fill="#f7a6bf"/>
    <rect x="15" y="17" width="34" height="13" rx="6.5" fill="#fab6ca"/>
    <rect x="22" y="9" width="20" height="12" rx="6" fill="#fdc9d8"/>
    <!-- cherry -->
    <circle cx="32" cy="7" r="4.5" fill="#d62f4b"/>
    <!-- liner -->
    <path d="M14 36h36l-4.2 20.2a3 3 0 0 1-2.9 2.3H21.1a3 3 0 0 1-2.9-2.3z" fill="#e8b36a"/>
  </g>
  <!-- liner pleats -->
  <g stroke="#c98b4a" stroke-width="2" stroke-linecap="round">
    <path d="M23 40.5l1.2 14.5M32 40.5v14.5M41 40.5l-1.2 14.5"/>
  </g>
  <!-- sprinkles -->
  <g stroke-width="2.2" stroke-linecap="round">
    <path d="M18 32l2-1.2" stroke="#fff"/>
    <path d="M30 31.5l2.4 1" stroke="#f2c14e"/>
    <path d="M44 31l-2.2 1.2" stroke="#fff"/>
    <path d="M26 22.5l2-1" stroke="#f2c14e"/>
    <path d="M38 23l-2.2-.6" stroke="#fff"/>
  </g>
  <!-- cherry shine -->
  <circle cx="30.4" cy="5.4" r="1.3" fill="#fff"/>
  <!-- face -->
  <circle cx="26" cy="46" r="2" fill="#4a2c1a"/>
  <circle cx="38" cy="46" r="2" fill="#4a2c1a"/>
  <path d="M29.5 49.5q2.5 2.6 5 0" fill="none" stroke="#4a2c1a" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="22" cy="49" r="2.2" fill="#f08aa5" opacity=".7"/>
  <circle cx="42" cy="49" r="2.2" fill="#f08aa5" opacity=".7"/>
</svg>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`. Se o primeiro teste de `index.test.js` falhar, o link colado no HTML difere do `GENERAL_LINK`: rode `node -e "import('./js/whatsapp.js').then(m => console.log(m.GENERAL_LINK))"` e copie a saída exatamente.

- [ ] **Step 5: Commit**

```bash
git add index.html favicon.svg tests/index.test.js
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
  /* Keeps the button shape visible in forced-colors (high-contrast) mode. */
  border: 2px solid transparent;
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
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cake {
  display: flex;
  flex-wrap: wrap;
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
  flex: 1 1 8rem;
  min-width: 0;
}

.cake__name {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.cake__price {
  margin: 0.15rem 0 0.5rem;
  color: var(--brown-light);
  font-weight: 700;
  white-space: nowrap;
}

/* Notice shown when the menu fails to load.
   Do not set `display` here: it would override the `hidden` attribute
   that js/app.js removes when the menu fails to load. */
.error-notice {
  padding: 1rem;
  background: var(--paper);
  border: 2px solid var(--border);
  border-radius: 6px;
  text-align: center;
}

.error-notice p {
  margin: 0 0 1rem;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 960px) {
  .menu__list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

test('app.js revalidates the menu on every visit', () => {
  assert.match(code, /fetch\(MENU_URL,\s*\{\s*cache:\s*'no-cache'\s*\}\)/);
});

test('app.js sets loading before src so lazy loading is honored', () => {
  assert.ok(code.indexOf("photo.loading = 'lazy'") !== -1);
  assert.ok(code.indexOf("photo.loading = 'lazy'") < code.indexOf('photo.src ='));
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
  // Set loading before src: some browsers ignore it otherwise.
  photo.loading = 'lazy';
  photo.src = PHOTOS_DIR + cake.photo;
  photo.alt = `Bolo de ${cake.name}`;

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
    // Revalidate on every visit so a price change shows up right after publishing
    // (static hosts can otherwise serve a cached menu.json for several minutes).
    const response = await fetch(MENU_URL, { cache: 'no-cache' });
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

O console do navegador vai mostrar erros 404 para `img/hero.webp`, `img/*.webp` e `favicon.ico`. Isso é esperado antes da Task 8: as fotos que faltam aparecem como os blocos marrons.

Conferir:
- [ ] O nome "Delicias da Cá" aparece em letra manuscrita, em cima do fundo creme.
- [ ] O topo mostra um bloco marrom no lugar da foto (as fotos chegam na Task 8) e o botão verde "Fazer encomenda no WhatsApp".
- [ ] Os avisos de entrega e horários aparecem.
- [ ] Existem 18 cards, na ordem do cardápio original, cada um com bloco marrom, nome, preço e botão. Nenhum ícone de imagem quebrada.
- [ ] Os nomes longos ("Chocolate com cobertura de brigadeiro") quebram em linhas sem estourar o card.
- [ ] Não há rolagem horizontal.
- [ ] Texto ampliado: no DevTools (modo dispositivo, 360px), com o tamanho da fonte do Chrome em "Muito grande" (Configurações → Aparência), a página não ganha rolagem horizontal e o texto não sai dos cartões (o texto pode descer para baixo da foto). Uma janela de desktop não encolhe até 360px, por isso é preciso o modo dispositivo do DevTools.
- [ ] O botão "Pedir pelo WhatsApp" fica em uma ou duas linhas sem estourar o card.
- [ ] Os preços em Georgia ficam bons. Os números "de livro antigo" da Georgia aparecem no iPhone, no Mac e no Windows; o Android não tem Georgia e usa a fonte com serifa padrão dele. Por isso, conferir num iPhone e num Android. Se os preços ficarem estranhos, trocar a fonte de `.cake__price` por `var(--font-button)`.

- [ ] **Step 3: Conferir os botões**

- [ ] Clicar em "Pedir pelo WhatsApp" do card "Paçoca vulcão". Abre o WhatsApp (web ou app) com a mensagem `Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de Paçoca vulcão (R$ 50,00).` e o número (19) 99685-1415. Não enviar a mensagem.
- [ ] Clicar no botão do topo. A mensagem é `Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.`

- [ ] **Step 4: Conferir telas maiores**

Deixar a janela em 700px e depois em 1100px.
- [ ] Com 700px, o cardápio fica em 2 colunas. Com 1100px, em 3 colunas.

- [ ] **Step 5: Conferir as falhas**

- [ ] **JSON ausente:** renomear temporariamente `data/menu.json` para `data/menu.json.bak`, recarregar. Deve aparecer o aviso "Não conseguimos mostrar o cardápio agora..." com o botão do WhatsApp. Depois voltar o nome original.
- [ ] **Sem JavaScript:** DevTools → ⌘⇧P → "Disable JavaScript" → recarregar. Deve aparecer o aviso do `<noscript>` com o botão. O botão do topo continua funcionando. Sem JavaScript, o topo mostra o ícone de imagem quebrada e o texto alternativo da foto até a Task 8, porque o `onerror` embutido na imagem precisa de JavaScript. Isso é esperado, não é defeito. Reativar o JavaScript depois.

- [ ] **Step 6: Rodar os testes e parar o servidor**

Run: `npm test`
Expected: `ℹ fail 0`. Parar o servidor com Ctrl+C.

- [ ] **Step 7: Commit (somente se algo foi corrigido)**

Liste só os arquivos que foram de fato corrigidos. Se sobrou um `data/menu.json.bak` do passo 5, apague-o: ele não pode ir para o commit.

```bash
git add <arquivos corrigidos>
git status --short   # check that only the fixed files were staged
git commit -m "fix: ajustes encontrados na conferência no navegador"
```

---

### Task 8: Fotos dos bolos

**Gate:** as fotos podem chegar em lotes, então não é preciso esperar pelas 18 nem pela foto de destaque do topo. Converta as que já foram entregues, cada uma identificada pelo `id` do bolo. Um bolo sem foto é um estado permitido: o card mostra o bloco marrom, e o teste só lista quais ainda faltam, sem falhar. Sem `img/hero.webp`, o topo da página fica sem foto. A pasta de origem tem um arquivo por foto, nomeado pelo `id` do bolo, como `cenoura-vulcao.jpg`, e a foto de destaque como `hero.jpg`. Servem `.jpg`, `.jpeg`, `.png` e `.heic`, em maiúsculas ou minúsculas: as exportações do iPhone (`.HEIC`, `.JPG`) entram como vêm, sem conversão prévia. Neste repositório a pasta é `fotos-originais/`, que está no `.gitignore` (só as versões otimizadas de `img/` vão para o Git); outra opção é `~/Pictures/cake-photos/`. Os prints da raiz **não** servem: têm texto sobreposto.

Primeiro lote (entregue em 30/10/2026): chegaram 10 das 18 fotos (`banana`, `cenoura-brigadeiro`, `cenoura-chocolate`, `chocolate-brigadeiro`, `fuba-goiabada`, `laranja`, `limao`, `ninho-cobertura`, `ninho-vulcao` e `pacoca-vulcao`). Faltam `cenoura`, `cenoura-vulcao`, `chocolate`, `chocolate-chocolate`, `fuba`, `fuba-cremoso`, `milho` e `pacoca`, além da foto de destaque.

**Files:**
- Create: `tests/photos.test.js`
- Create: `img/<id>.webp` para cada foto já entregue (10 das 18 no primeiro lote) e, quando existir, `img/hero.webp`
- Usa, sem alterar (já estão no repositório): `scripts/photo-lib.mjs`, `scripts/prepare-photos.mjs`, `tests/photo-lib.test.js` e `tests/prepare-photos.test.js`

- [ ] **Step 1: Escrever o teste**

Criar `tests/photos.test.js`. Ele confere só os arquivos que existem em `img/`: cada um tem de ser citado no `data/menu.json` (ou ser o `hero.webp`) e passar no `checkWebp` de `scripts/photo-lib.mjs`, a mesma checagem que o conversor faz ao gravar (container WebP íntegro, até `MAX_BYTES` = 200 KB e sem metadados EXIF nem XMP). A falta de uma foto não reprova nada: o teste só imprime a lista dos bolos que ainda não têm foto.

Este teste importa `MAX_BYTES` e `checkWebp` de `scripts/photo-lib.mjs`, que já está no repositório. Para rodar o bloco abaixo fora do repositório (por exemplo, extraído para uma pasta temporária), leve o `scripts/photo-lib.mjs` e o `data/menu.json` junto, ou pule este teste.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { MAX_BYTES, checkWebp } from '../scripts/photo-lib.mjs';

const HERO_FILE = 'hero.webp';

const cakes = JSON.parse(
  await readFile(new URL('../data/menu.json', import.meta.url), 'utf8'),
);
const imgDir = new URL('../img/', import.meta.url);
const present = (await readdir(imgDir).catch(() => [])).filter((name) => !name.startsWith('.'));
const known = new Set([HERO_FILE, ...cakes.map((cake) => cake.photo)]);

for (const file of present) {
  test(`img/${file} is a known, valid and light WebP`, async () => {
    assert.ok(known.has(file), `${file} is not referenced by data/menu.json and is not ${HERO_FILE}`);
    const bytes = await readFile(new URL(file, imgDir));
    const problems = checkWebp(bytes, { maxBytes: MAX_BYTES });
    assert.deepEqual(problems, [], `${file} has problems: ${problems.join('; ')}`);
  });
}

test('lists the cakes that still have no photo', (t) => {
  const missing = cakes.filter((cake) => !present.includes(cake.photo)).map((cake) => cake.id);
  const hero = present.includes(HERO_FILE) ? 'present' : 'missing';
  t.diagnostic(`${missing.length} cake(s) without a photo yet: ${missing.join(', ') || 'none'}; ${HERO_FILE} ${hero}`);
});
```

- [ ] **Step 2: Rodar e ver a lista de sabores sem foto**

Run: `npm test`
Expected: este teste não tem fase vermelha, porque a falta de foto é permitida. Sem a pasta `img/`, `ℹ fail 0`, e passam os 21 testes anteriores, os do conversor (`tests/photo-lib.test.js` e `tests/prepare-photos.test.js`) e o que lista os bolos sem foto, com uma linha de diagnóstico como `18 cake(s) without a photo yet: banana, cenoura, ...; hero.webp missing`.

- [ ] **Step 3: Instalar o conversor (peça confirmação ao usuário antes)**

O macOS sabe ler WebP mas não gravar. O `cwebp` vem do pacote `webp` do Homebrew. O comando do passo 4 também usa o `sips`, que já vem no macOS. Dentro do Claude Code o Homebrew não roda (sandbox): se o `cwebp` não existir, peça ao usuário para rodar `brew install webp` num Terminal comum, em vez de tentar instalar por aqui.

Run: `command -v cwebp || brew install webp`
Expected: o caminho do `cwebp` ou o fim da instalação.

- [ ] **Step 4: Converter as fotos (lado maior de até 800px nos bolos e 1200px no destaque, só reduzindo, WebP qualidade 80)**

Quem faz o trabalho é o comando `scripts/prepare-photos.mjs`. O código dele **não** está copiado neste plano: ele mora no repositório (`scripts/photo-lib.mjs` e `scripts/prepare-photos.mjs`) e tem testes próprios (`tests/photo-lib.test.js` e `tests/prepare-photos.test.js`).

Primeiro confira os nomes na pasta de origem (aqui, `fotos-originais/`). Cada arquivo tem de se chamar `<id>.jpg`, com o `id` idêntico ao do `data/menu.json` (por exemplo, `cenoura-vulcao.jpg`), ou `hero.jpg` para a foto de destaque. Também valem `.jpeg`, `.png` e `.heic`, em maiúsculas ou minúsculas. O nome tem de ser exatamente o `id`: `banana-2.jpg` ou `IMG_1234.jpg` não são convertidos e saem na lista "Skipped (name is not a cake id or hero)", com a dica `rename to <id>.jpg`. Dois arquivos para o mesmo `id` (por exemplo, `banana.jpg` e `banana.png`) interrompem o comando antes de converter qualquer foto.

Rode primeiro o ensaio, que mostra o que seria feito (medida de origem, recorte, redução e medida final) sem gravar nada, e depois a conversão:

```bash
node scripts/prepare-photos.mjs --dry-run
node scripts/prepare-photos.mjs
```

Para cada foto, o comando:
- recorta as tarjas pretas de prints de tela (só as de 4px ou mais, com 4px de folga), aplica a rotação gravada nos metadados e **só reduz** (nunca amplia) o lado maior até 800px, ou 1200px no `hero`;
- grava `img/<id>.webp` com qualidade 80, sem metadados, e confere o resultado: até 200 KB, container WebP íntegro, sem EXIF nem XMP. A foto que falha aparece como `FAILED` na tabela e **não** é gravada; o `img/<id>.webp` anterior, se havia, fica como estava;
- sobrescreve a saída que já existe (a tabela diz `replaced existing`) e nunca altera nem apaga os originais. A gravação é atômica: o arquivo vai primeiro para um temporário na pasta de destino e é renomeado sobre o destino, então nunca fica meia foto, não sobra temporário, e um link simbólico no destino é substituído em vez de seguido.

O fim do comando é uma tabela com o `id`, a medida de origem, a medida final, os KB e as notas (`cropped bars` ou `crop skipped (--no-crop)`, `resized` ou `kept size`, `replaced existing`). O código de saída é 0 quando nenhuma foto falhou, 1 quando alguma falhou ou há `id` repetido, e 2 quando falta ferramenta ou o uso está errado. Opções: uma pasta de origem (padrão `fotos-originais`), `--out <pasta>` (padrão `img`) e `--no-crop`. O `--no-crop` desliga o recorte de todas as fotos da execução, e `--no-crop=<id>,<id>` só o dos `id` listados (um `id` que não está entre as fotos da execução é erro, com código 2 e nada convertido). Use-o quando o fundo for quase preto (um bolo sobre pano escuro, por exemplo): o detector não distingue esse fundo de uma tarja. `node scripts/prepare-photos.mjs --help` lista tudo.

Expected: `Done: N converted, 0 failed, 0 skipped.` (nomes ignorados avisam, mas não reprovam) e um `img/<id>.webp` para cada foto da pasta.

No primeiro lote, `cenoura-brigadeiro` (720x688) e `laranja` ficaram no tamanho original; as outras oito foram reduzidas para 800px no lado maior. A `laranja.jpg` era um print de celular de 540x1158 com barras pretas em cima (linhas 0 a 322) e embaixo (835 a 1157); a foto de verdade ocupa as linhas 323 a 834. A `laranja.webp` commitada, recortada à mão, tem 540x502. O comando conta a folga de 4px a partir da primeira linha que não é preta e recorta 540x504, sem nenhuma linha escura.

- [ ] **Step 5: Olhar cada foto gravada**

O comando termina com o lembrete `Open each output and check flavor, rotation and crop before committing.` porque nada disso é verificável por código. Abra cada `img/<id>.webp` (por exemplo, `open img/banana.webp`) e confira:
- o sabor é o do nome do arquivo (compare com o `name` do `data/menu.json`);
- a foto está em pé, não de lado nem de cabeça para baixo;
- não sobrou faixa preta nas bordas e o recorte não cortou o bolo. O comando só reconhece tarjas de 4px ou mais: uma faixa preta de 1 a 3px fica na foto, e a saída é recortar a origem e converter de novo. Se o recorte comeu um fundo escuro de propósito, converta de novo com `--no-crop=<id>`. (O `hero.png` de 1323x1189 que está em `fotos-originais/` tinha 13 linhas pretas em cima e 5 embaixo: o comando recorta as duas, e a foto sai com 1200x1055 e uns 142 KB.)

O `img/hero.webp` só existe se havia um `hero.jpg` (ou `.jpeg`, `.png`, `.heic`) na pasta de origem. Sem ele, o topo da página fica sem foto.

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`. Cada foto presente em `img/` vira um teste (`img/<arquivo> is a known, valid and light WebP`). Com as 10 fotos do primeiro lote, o `tests/photos.test.js` roda 11 testes (1 que lista os bolos sem foto e 10 de foto), somados aos 21 anteriores e aos do conversor, e a linha de diagnóstico lista os 8 bolos que faltam e `hero.webp missing`. Se alguma foto passar de 200 KB, o comando a marca como `FAILED` e não a grava: reduza a origem (por exemplo, recortando o que não é o bolo) e converta de novo, ou diminua `WEBP_QUALITY` em `scripts/photo-lib.mjs` (e atualize também o valor esperado no teste de constantes de `tests/photo-lib.test.js`). Se o teste disser que um arquivo "is not referenced", o nome dele não bate com o campo `photo` do `data/menu.json` (ou sobrou em `img/` um arquivo que não é foto).

- [ ] **Step 7: Conferir no navegador**

Subir o servidor como na Task 7 e conferir:
- [ ] Cada card com foto mostra o bolo certo (comparar com o nome). Os cards sem foto continuam com o bloco marrom, sem imagem quebrada.
- [ ] O topo mostra a foto de destaque, se o `hero.webp` já existe; senão, fica sem foto.
- [ ] Nenhuma foto está girada: fotos de celular guardam a rotação nos metadados (EXIF), e o WebP sai sem metadados. O comando aplica essa rotação antes de converter, mas confira mesmo assim. Se alguma estiver de lado ou de cabeça para baixo, gire a foto de origem e converta de novo. (As fotos do primeiro lote vieram sem rotação nos metadados.)
- [ ] O quadrado do card (112px) mostra o bolo inteiro: o CSS corta a foto no centro (`object-fit: cover`), e uma foto bem retangular pode perder as pontas. No primeiro lote, a mais retangular é `ninho-vulcao` (800x643), e o bolo cabe no quadrado central.
- [ ] A pasta `img/` só tem arquivos esperados. O teste já garante isso: ele falha para qualquer arquivo que não seja o `hero.webp` nem uma foto citada no `data/menu.json` (um `.png` esquecido, por exemplo).

- [ ] **Step 8: Commit**

Troque o `10` pelo número de fotos entregues neste lote.

```bash
git add img/ tests/photos.test.js
git commit -m "feat: fotos otimizadas de 10 bolos e teste que lista os sabores sem foto"
```

Quando chegarem as fotos que faltam (e a de destaque), repita os passos 4 a 8: o teste mostra o que ainda resta. O comando converte tudo o que está na pasta de origem e sobrescreve as saídas existentes; as fotos antigas saem idênticas, byte a byte, exceto a `laranja` (veja o passo 4). Para não mexer nas já commitadas, ponha só as novas numa pasta à parte e passe-a como origem (`node scripts/prepare-photos.mjs <pasta-das-novas>`), e use `git status` para ver o que mudou.

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

O navegador bloqueia a leitura do `data/menu.json` e também os módulos JavaScript quando o `index.html` é aberto com duplo clique. Por isso a página não mostra cardápio nenhum (só o título "Cardápio"). Para ver o site, é preciso um servidor local:

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

Depois de editar, rode `npm test`. Ele avisa se o JSON está quebrado (por exemplo, uma vírgula sobrando). Se incluir ou tirar um sabor de propósito, o teste `menu.json has the expected number of cakes` vai falhar: troque o número da constante `EXPECTED_COUNT` em `tests/menu.test.js`. Também confira que o campo `photo` é o `id` mais `.webp`. Incluir um sabor também pede a foto nova em `img/<id>.webp` (veja a seção Fotos). Sem ela o teste `tests/photos.test.js` não falha, mas lista o bolo entre os que ainda estão sem foto, e o card mostra o bloco marrom no lugar da imagem.

## Fotos

Uma foto por bolo em `img/<id>.webp`, com até 800px no lado maior e até 200 KB. Foto menor que 800px fica como está: não se amplia. A foto do topo é `img/hero.webp` (até 1200px no lado maior). Nenhuma foto é obrigatória: a que faltar não quebra a página (o card mostra um bloco marrom e o topo fica sem foto), e o `npm test` lista os bolos ainda sem foto. O teste também falha se sobrar em `img/` um arquivo que não seja o `hero.webp` nem uma foto citada no `data/menu.json`. Para converter as fotos:

1. Instale o `cwebp` uma vez, num Terminal comum (o Homebrew não roda dentro do sandbox do Claude Code): `brew install webp`. O comando também usa o `sips`, que já vem no macOS.
2. Ponha os originais em `fotos-originais/` (a pasta fica fora do Git), um arquivo por foto, com o nome do `id` do bolo: `cenoura-vulcao.jpg`. A foto do topo se chama `hero.jpg`. Servem `.jpg`, `.jpeg`, `.png` e `.heic`.
3. Rode:

```bash
node scripts/prepare-photos.mjs --dry-run   # só mostra o que seria feito
node scripts/prepare-photos.mjs             # converte para img/
```

O comando recorta as tarjas pretas dos prints de tela, aplica a rotação das fotos de celular, só reduz (nunca amplia) e grava WebP com qualidade 80. Ele recusa a foto que passar de 200 KB ou que tiver metadados (EXIF ou XMP), avisa dos arquivos cujo nome não é um `id` e não altera os originais. Se o recorte comer um fundo escuro de propósito, rode com `--no-crop=<id>` (ou só `--no-crop`, para todas as fotos). No fim, abra cada foto de `img/` e confira sabor, rotação e recorte antes de fazer o commit.

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

Com a hospedagem escolhida, anote a URL final com a barra no fim (por exemplo, a que o GitHub Pages ou o Netlify mostrar para o projeto). Chame de `PUBLIC_URL` nos passos seguintes. No GitHub Pages, quando o remoto for `github.com/<usuario>/delicias-da-ca`, a URL pública é `https://<usuario>.github.io/delicias-da-ca/` (confira o remoto com `git remote -v`).

- [ ] **Step 4: Acrescentar `og:url` e `og:image` ao `index.html`**

Só faça este passo com o `img/hero.webp` já no repositório: sem ele o `og:image` aponta para uma imagem que não existe, e a prévia do link sai sem foto.

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

- Antes de publicar: conferir o e-mail do autor dos commits (`git log --format='%an <%ae>'`); em repositório público ele fica visível.
- Opcional: um arquivo `.nojekyll` vazio na raiz do repositório impede que o GitHub Pages rode o Jekyll sobre os `.md` de `docs/`. Se for criado, rode `git add .nojekyll` junto com o `git add index.html` do item (a).

Seguir esta ordem:

(a) Fazer o commit das tags `og:`:

```bash
git add index.html
git commit -m "feat: prévia de compartilhamento com og:url e og:image"
```

(b) Terminar a branch `feat/cardapio-online` com a skill `superpowers:finishing-a-development-branch` (merge na `main` e envio ao GitHub). Isso só acontece com o pedido do usuário.

(c) Ativar o GitHub Pages a partir da `main` (Settings → Pages). O Pages gratuito exige repositório PÚBLICO, e isso também deixa público o e-mail de autor dos commits (veja o primeiro item acima). No Netlify, ligar o repositório ao site.

(d) Conferir o site publicado (Step 7).

- [ ] **Step 7: Conferir o site publicado**

- [ ] Abrir a URL pública no celular, ver os 18 cards (com foto nos bolos que já têm e o bloco marrom nos demais) e testar um botão de pedido.
- [ ] Enviar o link para si mesmo no WhatsApp e conferir a prévia (título, descrição e foto).
- Plano B, só se a prévia não mostrar a foto: o WhatsApp pode não aceitar WebP no `og:image` (e prefere imagens com menos de uns 300 KB). Gerar um JPEG com `sips -Z 1200 -s format jpeg -s formatOptions 70 <foto de origem> --out img/og.jpg`, conferir que ele tem menos de 300 KB, apontar o `og:image` para `PUBLIC_URL` + `img/og.jpg` (ou seja, `PUBLIC_URLimg/og.jpg`) e incluir o `img/og.jpg` no commit. O WhatsApp guarda em cache as prévias de link; por isso, depois de trocar para `img/og.jpg`, o reteste pode exigir uma variante da URL (por exemplo, acrescentar `?v=2` ao link compartilhado).
- [ ] Confirmar com a Cá os horários de encomenda e a grafia "Delicias" (pontos em aberto da spec).
