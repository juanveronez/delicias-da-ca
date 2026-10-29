# Cardápio online Delicias da Cá — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar um site estático de cardápio de bolos caseiros em que cada bolo tem um botão que abre o WhatsApp da Delicias da Cá com a mensagem do pedido já escrita.

**Architecture:** Página única (`index.html`) em HTML, CSS e JavaScript puros, sem build. Os bolos vêm de `data/cardapio.json`; `js/app.js` busca o JSON e monta os cards com `textContent`. A lógica que não pode quebrar (link do WhatsApp e formatação de preço) fica em `js/whatsapp.js`, um módulo ES de funções puras, testado com o executor nativo do Node (`node --test`).

**Tech Stack:** HTML5, CSS3, JavaScript (módulos ES), Node 22 (`node:test`, sem dependências), `python3 -m http.server` para ver o site localmente, `cwebp` (Homebrew `webp`) para converter fotos.

**Spec:** `docs/superpowers/specs/2026-10-29-cardapio-online-design.md`

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json` | Só `{"type":"module"}` e o script `test`. Sem dependências. |
| `.gitignore` | Ignora `.superpowers/`, os prints de referência, `.DS_Store`. |
| `js/whatsapp.js` | Funções puras: formatar preço, montar mensagem e link do WhatsApp. Sem DOM. |
| `data/cardapio.json` | Os 18 bolos, na ordem de exibição. Só dados. |
| `index.html` | Estrutura da página, textos fixos, meta tags, botão geral e aviso de erro. |
| `css/style.css` | Estilo A (rústico artesanal), mobile first. |
| `js/app.js` | Busca o JSON, monta os cards, trata erro. Usa o DOM. |
| `tests/whatsapp.test.js` | Testa `js/whatsapp.js`. |
| `tests/cardapio.test.js` | Valida `data/cardapio.json`. |
| `tests/index.test.js` | Garante que os links e meta tags do `index.html` estão corretos. |
| `tests/app.test.js` | Garante que `js/app.js` não injeta HTML e usa `rel` seguro. |
| `tests/fotos.test.js` | (Task 8) Garante que cada foto existe, é WebP e é leve. |
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL com `ERR_MODULE_NOT_FOUND` apontando para `js/whatsapp.js`.

- [ ] **Step 3: Implementar**

Criar `js/whatsapp.js`:

```js
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

### Task 3: Dados do cardápio (`data/cardapio.json`)

**Files:**
- Create: `tests/cardapio.test.js`
- Create: `data/cardapio.json`

- [ ] **Step 1: Escrever os testes que falham**

Criar `tests/cardapio.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function carregar() {
  const texto = await readFile(new URL('../data/cardapio.json', import.meta.url), 'utf8');
  return JSON.parse(texto);
}

test('cardapio.json é um JSON válido com uma lista', async () => {
  const bolos = await carregar();
  assert.ok(Array.isArray(bolos));
});

test('cardapio.json tem os 18 bolos', async () => {
  const bolos = await carregar();
  assert.equal(bolos.length, 18);
});

test('cada bolo tem id, nome, preco e foto válidos', async () => {
  const bolos = await carregar();
  for (const bolo of bolos) {
    assert.match(bolo.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `id inválido: ${bolo.id}`);
    assert.equal(typeof bolo.nome, 'string', `nome inválido em ${bolo.id}`);
    assert.ok(bolo.nome.trim().length > 0, `nome vazio em ${bolo.id}`);
    assert.equal(typeof bolo.preco, 'number', `preco inválido em ${bolo.id}`);
    assert.ok(Number.isFinite(bolo.preco) && bolo.preco > 0, `preco deve ser > 0 em ${bolo.id}`);
    assert.match(bolo.foto, /^[a-z0-9-]+\.webp$/, `foto inválida em ${bolo.id}`);
  }
});

test('os ids não se repetem', async () => {
  const bolos = await carregar();
  const ids = bolos.map((bolo) => bolo.id);
  assert.equal(new Set(ids).size, ids.length);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: os testes de `cardapio.test.js` falham com `ENOENT` para `data/cardapio.json`. Os de `whatsapp.test.js` continuam passando.

- [ ] **Step 3: Criar o JSON**

Criar `data/cardapio.json` (preços do cardápio atual, na mesma ordem dele):

```json
[
  { "id": "banana", "nome": "Banana", "preco": 35, "foto": "banana.webp" },
  { "id": "cenoura", "nome": "Cenoura", "preco": 30, "foto": "cenoura.webp" },
  { "id": "cenoura-brigadeiro", "nome": "Cenoura com cobertura de brigadeiro", "preco": 40, "foto": "cenoura-brigadeiro.webp" },
  { "id": "cenoura-chocolate", "nome": "Cenoura com cobertura de chocolate", "preco": 35, "foto": "cenoura-chocolate.webp" },
  { "id": "cenoura-vulcao", "nome": "Cenoura vulcão", "preco": 50, "foto": "cenoura-vulcao.webp" },
  { "id": "chocolate", "nome": "Chocolate", "preco": 30, "foto": "chocolate.webp" },
  { "id": "chocolate-brigadeiro", "nome": "Chocolate com cobertura de brigadeiro", "preco": 40, "foto": "chocolate-brigadeiro.webp" },
  { "id": "chocolate-chocolate", "nome": "Chocolate com cobertura de chocolate", "preco": 35, "foto": "chocolate-chocolate.webp" },
  { "id": "fuba", "nome": "Fubá", "preco": 30, "foto": "fuba.webp" },
  { "id": "fuba-goiabada", "nome": "Fubá com goiabada", "preco": 35, "foto": "fuba-goiabada.webp" },
  { "id": "fuba-cremoso", "nome": "Fubá cremoso", "preco": 40, "foto": "fuba-cremoso.webp" },
  { "id": "laranja", "nome": "Laranja", "preco": 30, "foto": "laranja.webp" },
  { "id": "limao", "nome": "Limão", "preco": 40, "foto": "limao.webp" },
  { "id": "milho", "nome": "Milho", "preco": 35, "foto": "milho.webp" },
  { "id": "ninho-cobertura", "nome": "Ninho com cobertura", "preco": 40, "foto": "ninho-cobertura.webp" },
  { "id": "ninho-vulcao", "nome": "Ninho vulcão", "preco": 50, "foto": "ninho-vulcao.webp" },
  { "id": "pacoca", "nome": "Paçoca", "preco": 40, "foto": "pacoca.webp" },
  { "id": "pacoca-vulcao", "nome": "Paçoca vulcão", "preco": 50, "foto": "pacoca-vulcao.webp" }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: `ℹ fail 0`.

- [ ] **Step 5: Conferir nomes e preços contra o cardápio original**

Abrir a imagem do cardápio (o print `Screenshot 2026-10-29 at 16.20.55.png`) ao lado de `data/cardapio.json` e conferir, linha a linha, nome e preço dos 18 sabores. Os testes não pegam um preço digitado errado. Se algo estiver diferente, corrigir o JSON e rodar `npm test` de novo.

- [ ] **Step 6: Commit**

```bash
git add data/cardapio.json tests/cardapio.test.js
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
import { LINK_GERAL } from '../js/whatsapp.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('todo link de WhatsApp do index.html é o link geral', () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(links.length >= 2, 'esperava pelo menos o botão do topo e o do rodapé');
  for (const link of links) {
    assert.equal(link, LINK_GERAL);
  }
});

test('links que abrem em nova aba usam rel seguro', () => {
  const abertos = [...html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].map((m) => m[0]);
  assert.ok(abertos.length > 0);
  for (const tag of abertos) {
    assert.match(tag, /rel="noopener noreferrer"/);
  }
});

test('index.html tem título, descrição e tags de prévia', () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<meta property="og:title" content="[^"]+">/);
  assert.match(html, /<meta property="og:description" content="[^"]+">/);
});

test('index.html tem o ponto de montagem do cardápio e o aviso de erro', () => {
  assert.match(html, /id="cardapio-lista"/);
  assert.match(html, /id="cardapio-aviso"/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `tests/index.test.js` falha com `ENOENT` para `index.html`.

- [ ] **Step 3: Criar `index.html`**

O endereço do WhatsApp aparece como `https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda.` em quatro lugares. Ele precisa ser idêntico ao `LINK_GERAL` (o teste confere). O link está escrito direto no HTML porque o botão do topo precisa funcionar mesmo sem JavaScript.

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
  <header class="topo">
    <div class="container">
      <h1 class="topo__marca">Delicias da Cá</h1>
      <p class="topo__frase">Bolos caseiros, feitos com carinho</p>
      <div class="topo__foto">
        <img src="img/destaque.webp" alt="Bolos caseiros da Delicias da Cá" onerror="this.remove()">
      </div>
      <a class="botao botao--grande" href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">Fazer encomenda no WhatsApp</a>
    </div>
  </header>

  <main>
    <section class="avisos" aria-label="Entrega e horários">
      <div class="container">
        <p><strong>Entregamos em Campinas.</strong> A taxa é combinada pelo WhatsApp.</p>
        <p><strong>Segunda a quarta:</strong> encomendas somente no período da manhã.</p>
        <p><strong>Quinta a domingo:</strong> pronta entrega, encomendas e entregas o dia todo.</p>
      </div>
    </section>

    <section class="cardapio" aria-labelledby="cardapio-titulo">
      <div class="container">
        <h2 id="cardapio-titulo" class="titulo-secao">Cardápio</h2>
        <ul id="cardapio-lista" class="cardapio__lista"></ul>
        <div id="cardapio-aviso" class="aviso-erro" hidden>
          <p>Não conseguimos mostrar o cardápio agora. Chame a Cá no WhatsApp e ela te passa os sabores e os preços.</p>
          <a class="botao" href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">Falar com a Cá no WhatsApp</a>
        </div>
        <noscript>
          <div class="aviso-erro">
            <p>Para ver o cardápio, ative o JavaScript do navegador. Ou chame a Cá no WhatsApp e ela te passa os sabores e os preços.</p>
            <a class="botao" href="https://wa.me/5519996851415?text=Ol%C3%A1%2C%20C%C3%A1!%20Vim%20pelo%20card%C3%A1pio%20online%20e%20gostaria%20de%20fazer%20uma%20encomenda." target="_blank" rel="noopener noreferrer">Falar com a Cá no WhatsApp</a>
          </div>
        </noscript>
      </div>
    </section>

    <section class="como-pedir" aria-labelledby="como-pedir-titulo">
      <div class="container">
        <h2 id="como-pedir-titulo" class="titulo-secao">Como pedir</h2>
        <ol>
          <li>Escolha o seu bolo.</li>
          <li>Toque em “Pedir pelo WhatsApp”.</li>
          <li>Combine data, horário e entrega com a Cá.</li>
        </ol>
      </div>
    </section>
  </main>

  <footer class="rodape">
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
Expected: `ℹ fail 0`. Se o primeiro teste de `index.test.js` falhar, o link colado no HTML difere do `LINK_GERAL`: rode `node -e "import('./js/whatsapp.js').then(m => console.log(m.LINK_GERAL))"` e copie a saída exatamente.

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
  --creme: #f4e9d3;
  --creme-escuro: #efdfc0;
  --papel: #fffaf0;
  --marrom: #4a2c1a;
  --marrom-claro: #7a4a22;
  --borda: #b48a5a;
  --verde: #3f6f2a;
  --verde-escuro: #2f5520;
  --foto-vazia: linear-gradient(135deg, #d9a35f, #a8683a);
  --fonte-manuscrita: 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive;
  --fonte-corpo: Georgia, 'Times New Roman', serif;
  --fonte-botao: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--creme);
  color: var(--marrom);
  font-family: var(--fonte-corpo);
  font-size: 1rem;
  line-height: 1.5;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Botão de WhatsApp (usado no topo, nos cards e nos avisos) */
.botao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.5rem 1rem;
  background: var(--verde);
  color: #fff;
  font-family: var(--fonte-botao);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  border-radius: 4px;
}

.botao:hover {
  background: var(--verde-escuro);
}

.botao:focus-visible,
.rodape a:focus-visible {
  outline: 3px solid var(--marrom);
  outline-offset: 2px;
}

.botao--grande {
  font-size: 1.05rem;
  padding: 0.65rem 1.25rem;
}

/* Topo */
.topo {
  background: var(--creme-escuro);
  border-bottom: 3px double var(--borda);
  padding: 1.25rem 0 1.5rem;
  text-align: center;
}

.topo__marca {
  margin: 0;
  font-family: var(--fonte-manuscrita);
  font-size: 2.75rem;
  font-weight: 400;
  line-height: 1.15;
}

.topo__frase {
  margin: 0.25rem 0 1rem;
}

.topo__foto {
  max-width: 560px;
  aspect-ratio: 4 / 3;
  margin: 0 auto 1rem;
  background: var(--foto-vazia);
  border-radius: 8px;
  overflow: hidden;
}

.topo__foto img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Avisos de entrega e horários */
.avisos {
  padding: 1rem 0;
  border-bottom: 1px dashed var(--borda);
}

.avisos p {
  margin: 0.35rem 0;
}

/* Títulos de seção */
.titulo-secao {
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--borda);
  font-size: 1.35rem;
  text-align: center;
}

.cardapio,
.como-pedir {
  padding: 1.5rem 0;
}

/* Cardápio */
.cardapio__lista {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bolo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--papel);
  border: 2px solid var(--borda);
  border-radius: 6px;
}

.bolo__foto {
  flex: none;
  width: 112px;
  height: 112px;
  background: var(--foto-vazia);
  border-radius: 4px;
  overflow: hidden;
}

.bolo__foto img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bolo__texto {
  flex: 1;
  min-width: 0;
}

.bolo__nome {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.25;
}

.bolo__preco {
  margin: 0.15rem 0 0.5rem;
  color: var(--marrom-claro);
  font-weight: 700;
  white-space: nowrap;
}

/* Aviso quando o cardápio não carrega */
.aviso-erro {
  padding: 1rem;
  background: var(--papel);
  border: 2px solid var(--borda);
  border-radius: 6px;
  text-align: center;
}

/* Como pedir */
.como-pedir ol {
  max-width: 420px;
  margin: 0 auto;
  padding-left: 1.5rem;
}

.como-pedir li {
  margin: 0.4rem 0;
}

/* Rodapé */
.rodape {
  padding: 1.25rem 0;
  background: var(--creme-escuro);
  border-top: 3px double var(--borda);
  text-align: center;
  font-size: 0.9rem;
}

.rodape p {
  margin: 0.25rem 0;
}

.rodape a {
  color: var(--marrom);
  font-weight: 700;
}

/* Telas maiores: mais colunas no cardápio */
@media (min-width: 640px) {
  .cardapio__lista {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .cardapio__lista {
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

const codigo = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('app.js nunca injeta HTML', () => {
  for (const proibido of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write']) {
    assert.ok(!codigo.includes(proibido), `${proibido} não pode aparecer em app.js`);
  }
});

test('app.js abre os links do WhatsApp com rel seguro', () => {
  assert.match(codigo, /\.rel\s*=\s*'noopener noreferrer'/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: `tests/app.test.js` falha com `ENOENT` para `js/app.js`.

- [ ] **Step 3: Implementar**

Criar `js/app.js`:

```js
import { formatarPreco, linkBolo } from './whatsapp.js';

const URL_CARDAPIO = 'data/cardapio.json';
const PASTA_FOTOS = 'img/';

const lista = document.getElementById('cardapio-lista');
const aviso = document.getElementById('cardapio-aviso');

function criarFoto(bolo) {
  const moldura = document.createElement('div');
  moldura.className = 'bolo__foto';

  const foto = document.createElement('img');
  // Sem foto, o bloco marrom da moldura continua aparecendo.
  foto.addEventListener('error', () => foto.remove());
  foto.src = PASTA_FOTOS + bolo.foto;
  foto.alt = `Bolo de ${bolo.nome}`;
  foto.loading = 'lazy';

  moldura.append(foto);
  return moldura;
}

function criarTexto(bolo) {
  const texto = document.createElement('div');
  texto.className = 'bolo__texto';

  const nome = document.createElement('h3');
  nome.className = 'bolo__nome';
  nome.textContent = bolo.nome;

  const preco = document.createElement('p');
  preco.className = 'bolo__preco';
  preco.textContent = formatarPreco(bolo.preco);

  const botao = document.createElement('a');
  botao.className = 'botao';
  botao.href = linkBolo(bolo);
  botao.target = '_blank';
  botao.rel = 'noopener noreferrer';
  botao.textContent = 'Pedir pelo WhatsApp';
  botao.setAttribute('aria-label', `Pedir ${bolo.nome} pelo WhatsApp`);

  texto.append(nome, preco, botao);
  return texto;
}

function criarCard(bolo) {
  const card = document.createElement('li');
  card.className = 'bolo';
  card.append(criarFoto(bolo), criarTexto(bolo));
  return card;
}

async function iniciar() {
  try {
    const resposta = await fetch(URL_CARDAPIO);
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }
    const bolos = await resposta.json();
    if (!Array.isArray(bolos) || bolos.length === 0) {
      throw new Error('cardápio vazio');
    }
    lista.replaceChildren(...bolos.map(criarCard));
  } catch (erro) {
    console.error('Não foi possível carregar o cardápio:', erro);
    lista.replaceChildren();
    aviso.hidden = false;
  }
}

iniciar();
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

- [ ] **JSON ausente:** renomear temporariamente `data/cardapio.json` para `data/cardapio.json.bak`, recarregar. Deve aparecer o aviso "Não conseguimos mostrar o cardápio agora..." com o botão do WhatsApp. Depois voltar o nome original.
- [ ] **Sem JavaScript:** DevTools → ⌘⇧P → "Disable JavaScript" → recarregar. Deve aparecer o aviso do `<noscript>` com o botão. O botão do topo continua funcionando. Reativar o JavaScript depois.

- [ ] **Step 6: Rodar os testes e parar o servidor**

Run: `npm test`
Expected: `ℹ fail 0`. Parar o servidor com Ctrl+C.

- [ ] **Step 7: Commit (somente se algo foi corrigido)**

```bash
git add -A
git status --short   # conferir que só os arquivos corrigidos entraram
git commit -m "fix: ajustes encontrados na conferência no navegador"
```

---

### Task 8: Fotos dos bolos

**Gate:** só comece quando o usuário tiver entregue as 18 fotos dos bolos e a foto de destaque do topo, cada uma identificada. Sugestão: uma pasta (ex.: `~/Pictures/fotos-bolos/`) com os arquivos `.jpg` nomeados pelo `id` do bolo, como `cenoura-vulcao.jpg`, e a foto de destaque como `destaque.jpg`. Os prints da raiz **não** servem: têm texto sobreposto.

**Files:**
- Create: `tests/fotos.test.js`
- Create: `img/destaque.webp` e `img/<id>.webp` para os 18 bolos

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/fotos.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const LIMITE_BYTES = 200 * 1024;

const bolos = JSON.parse(
  await readFile(new URL('../data/cardapio.json', import.meta.url), 'utf8'),
);
const arquivos = ['destaque.webp', ...bolos.map((bolo) => bolo.foto)];

for (const arquivo of arquivos) {
  test(`img/${arquivo} existe, é WebP e é leve`, async () => {
    const bytes = await readFile(new URL(`../img/${arquivo}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', 'não é um arquivo WebP');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', 'não é um arquivo WebP');
    assert.ok(
      bytes.length <= LIMITE_BYTES,
      `${arquivo} tem ${bytes.length} bytes; o limite é ${LIMITE_BYTES}`,
    );
  });
}
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: 19 testes de `fotos.test.js` falham com `ENOENT` (as fotos ainda não existem).

- [ ] **Step 3: Instalar o conversor (peça confirmação ao usuário antes)**

O macOS sabe ler WebP mas não gravar. O `cwebp` vem do pacote `webp` do Homebrew.

Run: `command -v cwebp || brew install webp`
Expected: o caminho do `cwebp` ou o fim da instalação.

- [ ] **Step 4: Converter as fotos dos bolos (800px de largura máxima, WebP qualidade 80)**

Ajuste `PASTA` para a pasta com as fotos do usuário.

```bash
PASTA="$HOME/Pictures/fotos-bolos"
TMP="$(mktemp -d)"
mkdir -p img
for original in "$PASTA"/*.jpg; do
  id="$(basename "$original" .jpg)"
  [ "$id" = "destaque" ] && continue
  sips -Z 800 -s format png "$original" --out "$TMP/$id.png" >/dev/null
  cwebp -quiet -q 80 "$TMP/$id.png" -o "img/$id.webp"
done
```

- [ ] **Step 5: Converter a foto de destaque (1200px)**

```bash
sips -Z 1200 -s format png "$PASTA/destaque.jpg" --out "$TMP/destaque.png" >/dev/null
cwebp -quiet -q 80 "$TMP/destaque.png" -o img/destaque.webp
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
git add img/ tests/fotos.test.js
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

## Ver o site no computador

O navegador bloqueia a leitura do `data/cardapio.json` quando o `index.html` é aberto com duplo clique. Use um servidor local:

```bash
python3 -m http.server 8000
```

Abra http://localhost:8000.

## Mudar um preço ou incluir um sabor

Edite só o `data/cardapio.json`. Cada bolo é uma linha:

```json
{ "id": "cenoura-vulcao", "nome": "Cenoura vulcão", "preco": 50, "foto": "cenoura-vulcao.webp" }
```

- `id`: minúsculas, sem acento nem espaço, com hífen entre as palavras. É o nome-base da foto.
- `nome`: o que aparece no card e na mensagem do WhatsApp.
- `preco`: número em reais, sem o símbolo `R$`.
- `foto`: nome do arquivo dentro de `img/`, sempre `.webp`.

Depois de editar, rode `npm test`. Ele avisa se o JSON está quebrado (por exemplo, uma vírgula sobrando).

## Fotos

Uma foto por bolo em `img/<id>.webp`, com até 800px de largura e menos de 200 KB. A foto do topo é `img/destaque.webp` (até 1200px). Para converter, instale o `cwebp` (`brew install webp`) e veja a Task 8 do plano em `docs/superpowers/plans/`.

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

Com a hospedagem escolhida, anote a URL final com a barra no fim (por exemplo, a que o GitHub Pages ou o Netlify mostrar para o projeto). Chame de `URL_PUBLICA` nos passos seguintes.

- [ ] **Step 4: Acrescentar `og:url` e `og:image` ao `index.html`**

Dentro do `<head>`, logo depois da linha `<meta property="og:description" ...>`, inserir as duas linhas abaixo, trocando `URL_PUBLICA` pela URL do passo 3:

```html
  <meta property="og:url" content="URL_PUBLICA">
  <meta property="og:image" content="URL_PUBLICAimg/destaque.webp">
```

Exemplo de resultado, se `URL_PUBLICA` for `https://exemplo.netlify.app/`:

```html
  <meta property="og:url" content="https://exemplo.netlify.app/">
  <meta property="og:image" content="https://exemplo.netlify.app/img/destaque.webp">
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
