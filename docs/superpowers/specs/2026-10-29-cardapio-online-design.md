# Cardápio online Delicias da Cá — Design

Data: 2026-10-29

## Objetivo

Um cardápio online para a Delicias da Cá vender bolos caseiros em Campinas/SP, com entrega. O site não processa pedido nem pagamento: ele serve de vitrine e leva o cliente ao WhatsApp, onde a venda é fechada. Cada bolo tem um botão que abre a conversa com a mensagem já escrita.

## Negócio

- Bolos caseiros, vendidos e entregues em Campinas/SP.
- Contato e pedidos: WhatsApp (19) 99685-1415 (`5519996851415` no link).
- Entrega: a taxa e a região são combinadas na conversa, então o site não mostra valores de frete.
- Horários (lidos da imagem do cardápio, texto cortado no fim):
  - Segunda a quarta: encomendas somente no período da manhã.
  - Quinta a domingo: pronta entrega, encomendas e entregas o dia todo.

## Decisões

| Tema | Decisão |
|---|---|
| Fluxo de pedido | Botão "Pedir pelo WhatsApp" em cada bolo. Sem carrinho. Mais um botão geral no topo. |
| Fotos | Há uma foto por bolo. O cardápio é uma lista de cards com foto. |
| Entrega | Taxa combinada no WhatsApp. |
| Estilo | **A · Rústico artesanal**: papel creme, marrom e verde, tipografia manuscrita. Segue a identidade do cardápio atual. |
| Manutenção | Quem edita o cardápio é o desenvolvedor, num arquivo JSON. Não há painel nem login. |
| Tecnologia | HTML, CSS e JavaScript puros, sem build e sem framework. A página não tem dependência de execução: nenhum pacote npm vai ao ar. |
| Dados | Os bolos ficam em `data/menu.json`, só dados, sem código. |
| Qualidade de código | Biome 2.6.4 (lint, formatação e ordem dos imports), o único `devDependency`, em versão exata (sem `^` nem `~`), com o `package-lock.json` versionado. `npm run lint` confere e `npm run lint:fix` corrige. Estilo: aspas simples, ponto e vírgula, 2 espaços, vírgula final e 120 colunas. Detalhes em "Qualidade de código e CI/CD". |
| CI/CD | **CI:** o GitHub Actions (`.github/workflows/ci.yml`) roda `npm ci`, `npm run lint` e `npm test` em todo push na `main` e em todo pull request, com o Node de `.nvmrc`. **CD:** o Netlify publica tudo o que chega na `main`. O workflow não faz deploy. O Dependabot (`.github/dependabot.yml`) abre PRs semanais para as actions e para o Biome. |
| Publicação | Netlify, plano gratuito, em https://delicias-da-ca.netlify.app/. O Netlify publica só os arquivos listados no `netlify.toml` (copiados para `dist/`), não o repositório inteiro. O mesmo arquivo define `NPM_FLAGS = "--omit=dev"`, para o Netlify não instalar o Biome no deploy. |

## Convenções de código

- Todo o código fica em inglês: identificadores (variáveis, funções e constantes), comentários, descrições e mensagens dos testes, nomes de arquivo, chaves do JSON, ids do HTML, classes e propriedades personalizadas do CSS e mensagens de console.
- Só fica em português o que o usuário final vê: os textos, títulos e rótulos da página, a mensagem do WhatsApp, os atributos `alt` e `aria-label`, o `<title>`, a meta description e as tags Open Graph, os avisos e o `name` de cada bolo.
- Exceção deliberada: os valores de `id` dos bolos (por exemplo, `cenoura-vulcao`) e os nomes das fotos derivados deles (`cenoura-vulcao.webp`) seguem o nome do produto, em português. O mesmo vale para `lang="pt-BR"` e `Intl.NumberFormat('pt-BR', ...)`.
- A documentação (spec e plano) continua em português, exceto o `README.md`, que é escrito em inglês por ser a página do projeto no GitHub. Em todos os documentos, todo identificador, caminho, classe ou chave citado usa os nomes em inglês.

## Estrutura da página

Uma coluna no celular, que é o uso principal. Em telas maiores o cardápio passa para 2 ou 3 colunas.

1. **Topo:** "Delicias da Cá", a frase "Bolos caseiros, feitos com carinho", a foto dos bolos em destaque e o botão "Fazer encomenda no WhatsApp".
2. **Avisos:** entrega em Campinas com taxa combinada no WhatsApp, e os horários de encomenda.
3. **Cardápio:** os 18 sabores em cards. Cada card tem foto, nome, preço e o botão "Pedir pelo WhatsApp". Mesma ordem do cardápio atual, sem filtros nem abas.
4. **Como pedir:** três passos. Escolha o bolo, toque em "Pedir pelo WhatsApp", combine data, horário e entrega com a Cá.
5. **Rodapé:** Delicias da Cá, Campinas/SP, e o WhatsApp (19) 99685-1415.

## Cardápio inicial

Os preços vêm da imagem do cardápio atual.

| id | Nome | Preço (R$) |
|---|---|---|
| `banana` | Banana | 35,00 |
| `cenoura` | Cenoura | 30,00 |
| `cenoura-brigadeiro` | Cenoura com cobertura de brigadeiro | 40,00 |
| `cenoura-chocolate` | Cenoura com cobertura de chocolate | 35,00 |
| `cenoura-vulcao` | Cenoura vulcão | 50,00 |
| `chocolate` | Chocolate | 30,00 |
| `chocolate-brigadeiro` | Chocolate com cobertura de brigadeiro | 40,00 |
| `chocolate-chocolate` | Chocolate com cobertura de chocolate | 35,00 |
| `fuba` | Fubá | 30,00 |
| `fuba-goiabada` | Fubá com goiabada | 35,00 |
| `fuba-cremoso` | Fubá cremoso | 40,00 |
| `laranja` | Laranja | 30,00 |
| `limao` | Limão | 40,00 |
| `milho` | Milho | 35,00 |
| `ninho-cobertura` | Ninho com cobertura | 40,00 |
| `ninho-vulcao` | Ninho vulcão | 50,00 |
| `pacoca` | Paçoca | 40,00 |
| `pacoca-vulcao` | Paçoca vulcão | 50,00 |

## Dados

`data/menu.json` é uma lista na ordem de exibição:

```json
[
  { "id": "cenoura-vulcao", "name": "Cenoura vulcão", "price": 50, "photo": "cenoura-vulcao.webp" }
]
```

- `id`: texto único, em minúsculas, sem acento nem espaço. É o nome-base da foto.
- `name`: texto exibido no card e na mensagem do WhatsApp.
- `price`: número em reais, sem símbolo. A formatação (`R$ 50,00`) é feita pelo site.
- `photo`: nome do arquivo dentro de `img/`, sempre o `id` mais `.webp` (por exemplo, `cenoura-vulcao.webp`).

## Link do WhatsApp

- Formato: `https://wa.me/5519996851415?text=<mensagem codificada com encodeURIComponent>`.
- Mensagem de cada bolo: `Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de {name} ({price}).`
- Mensagem do botão geral: `Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.`
- Os links abrem em nova aba, com `rel="noopener noreferrer"`.

## Arquivos

```
index.html
favicon.svg                → ícone da aba: um bolo de forma desenhado em SVG
og-image.jpg               → prévia do link no WhatsApp e no Instagram (JPEG, 1200x630)
netlify.toml               → o que o Netlify publica: copia só os arquivos do site para dist/; NPM_FLAGS = "--omit=dev" deixa o Biome fora do deploy
css/style.css
data/menu.json
js/whatsapp.js             → funções puras: montar o link e formatar o preço
js/app.js                  → busca o JSON, monta os cards, trata erros
scripts/photo-lib.mjs      → funções puras do conversor de fotos
scripts/prepare-photos.mjs → converte as fotos de fotos-originais/ para img/*.webp
img/                       → fotos otimizadas
tests/                     → testes (inclui tooling.test.js, o contrato entre .nvmrc, package.json, CI, biome.json e netlify.toml)
.gitignore                 → ignora, entre outros, node_modules/ e dist/ (a pasta que o build do Netlify gera)
package.json               → "name", "private", "type", os scripts "test", "lint" e "lint:fix" e o Biome como único devDependency (versão exata); sem dependências de execução
package-lock.json          → versões exatas da árvore de dependências; o CI instala com npm ci
biome.json                 → configuração do Biome: estilo, escopo (js, scripts, tests, css, data) e regras recommended
.nvmrc                     → versão do Node (22), lida pelo nvm use e pelo CI
.github/workflows/ci.yml   → CI: npm ci, npm run lint e npm test
.github/dependabot.yml     → PRs semanais para as versões das actions e do Biome
README.md                  → página do projeto no GitHub, em inglês
```

`js/whatsapp.js` é um módulo ES, carregado pelo navegador por `<script type="module">` e importado pelos testes no Node.

## Fotos

- Uma foto por bolo em `img/<id>.webp`, com até 800px no lado maior (o limite vale para o lado maior, não só para a largura). A foto de destaque do topo é `img/hero.webp`, com até 1200px no lado maior.
- As fotos nunca são ampliadas: uma foto menor que o limite mantém o tamanho original, porque ampliar só a deixa mais borrada e mais pesada.
- Prints de tela com barras pretas são recortados antes da conversão, para não sobrar faixa escura na foto.
- As fotos podem chegar em lotes. Um bolo sem foto é um estado permitido, e o `npm test` lista quais ainda faltam.
- A otimização é feita antes de entrar no repositório. Os prints enviados têm uns 5 MB cada, grandes demais para o site.
- **Conversor:** `node scripts/prepare-photos.mjs` lê as fotos de `fotos-originais/`, nomeadas pelo `id` do bolo (`banana.jpg`; também `.jpeg`, `.png` e `.heic`) ou `hero` (`hero.jpg`), e grava `img/<id>.webp`. Os originais nunca são alterados.
  - Recorta as tarjas pretas dos prints (só as de 4px ou mais, com 4px de folga; a faixa preta de 5 linhas do `hero.png` entra), aplica a rotação gravada nos metadados das fotos de celular, só reduz (nunca amplia) e grava WebP com qualidade 80.
  - Confere cada arquivo gravado: até 200 KB, container WebP íntegro e sem metadados EXIF nem XMP. A foto que falha não é gravada, e o `img/<id>.webp` anterior continua como estava. A gravação é atômica: o arquivo vai primeiro para um temporário na pasta de destino e é renomeado sobre o destino, então nunca fica meia foto, não sobra temporário e um link simbólico no destino é substituído, não seguido.
  - Nomes que não são um `id` (nem `hero`) são listados como ignorados. Dois arquivos para o mesmo `id` interrompem o comando antes de converter. `--dry-run` mostra o plano sem gravar nada, e `--out <pasta>` muda o destino. Um fundo quase preto (por exemplo, um bolo sobre pano escuro) parece tarja para o detector: `--no-crop` desliga o recorte de todas as fotos da execução e `--no-crop=<id>,<id>` só dos `id` listados. Um `id` que não está entre as fotos da execução é erro (código 2), e nada é convertido.
  - Exige macOS (`sips`) e o `cwebp` (`brew install webp`, num Terminal comum). Ele não julga sabor, rotação nem recorte: cada saída ainda precisa ser aberta e conferida antes do commit.
- Se a foto de um bolo faltar, o card mostra um bloco marrom no lugar, sem imagem quebrada.
- Cada imagem tem texto alternativo com o nome do bolo.

## Erros

- **JSON não carrega ou é inválido, ou o JavaScript está desligado:** a lista de cards é substituída por um aviso com o botão geral do WhatsApp. O cliente nunca fica sem caminho para pedir.
- **Foto ausente:** bloco marrom, como descrito acima.

## Segurança

- Os textos do JSON entram na página como texto puro (`textContent`), nunca como HTML.
- O JSON só tem dados, então um erro de edição não executa nem quebra código.
- Links externos usam `rel="noopener noreferrer"`.

## Compartilhamento

A página tem `title`, `meta description` e tags Open Graph, para o link aparecer com prévia no WhatsApp e no Instagram: `og:title`, `og:description`, `og:url` (`https://delicias-da-ca.netlify.app/`), `og:image`, `og:image:width`, `og:image:height` e `og:image:alt`.

- O `og:image` é o JPEG `og-image.jpg`, na raiz do repositório, com 1200x630px e menos de 300 KB (hoje uns 230 KB). Não é o WebP: o WhatsApp e o Instagram leem JPEG e PNG com mais confiança, e preferem imagens leves.
- A imagem é um recorte do `img/hero.webp` que enquadra os cinco bolos em fila. Para gerar de novo: converter o WebP para PNG com o `sips`, recortar 1200x630 a partir da linha 130 e gravar em JPEG com qualidade 78 (o passo a passo está na Task 9 do plano). A foto de origem não tem metadados: o JPEG só leva as medidas da imagem, sem GPS nem dados de câmera.
- O `og:image` e o `og:url` são URLs absolutas e ficam na mesma origem. Se o nome do site no Netlify for outro, as duas tags precisam trocar de endereço juntas.
- O WhatsApp guarda as prévias em cache. Para testar de novo depois de uma mudança, acrescente `?v=2` ao link.

## Acessibilidade

- O verde do mockup (`#5b8a3c`) com texto branco dá cerca de 4:1 de contraste, abaixo dos 4,5:1 recomendados para texto pequeno. O botão usa um verde mais escuro, de modo que atinja 4,5:1 ou mais.
- Os botões são links (`<a>`) com área de toque de pelo menos 44px de altura.
- O texto do corpo tem tamanho confortável no celular, sem exigir zoom.
- O nome acessível do botão de cada card começa com o texto visível ("Pedir pelo WhatsApp: {name}"), para quem usa comando de voz.
- O layout aguenta texto ampliado: o grid usa colunas `minmax(0, 1fr)`, o nome quebra em qualquer ponto se necessário e o texto do cartão desce para baixo da foto quando falta espaço.

## Testes

Usam o executor do próprio Node (`node --test`), sem instalar nada: o `npm test` não precisa do `npm ci`, que só é necessário para o lint.

- **Link do WhatsApp:** número correto, mensagem codificada, nome com acento e com espaço (ex.: "Paçoca vulcão"), botão geral sem bolo.
- **Preço:** `50` vira `R$ 50,00`; `30` vira `R$ 30,00`.
- **`menu.json`:** é um JSON válido (o que pega a vírgula sobrando antes de publicar), e cada item tem `id`, `name`, `price` (número positivo) e `photo`, que tem de ser o `id` mais `.webp`. A quantidade de bolos é conferida contra uma constante nomeada (`EXPECTED_COUNT`), e `id` repetido é reportado pelo nome.
- **`index.html`:** todos os links do WhatsApp são o link geral, e a quantidade deles é conferida contra uma constante nomeada (`EXPECTED_WHATSAPP_LINK_COUNT`). Os links que abrem em nova aba têm `rel="noopener noreferrer"`. O aviso de erro começa oculto e o `<noscript>` oferece o WhatsApp. O favicon (`favicon.svg`) referenciado no `<head>` tem de existir. A prévia do link é conferida: `og:url` é uma URL `https://` absoluta que termina em `/`; `og:image` é absoluta, na mesma origem do `og:url`, e o caminho dela existe como arquivo na raiz do repositório; esse arquivo é JPEG ou PNG (conferido pelos primeiros bytes) e tem até 300 KB; `og:image:width` e `og:image:height` são numéricos e iguais às medidas reais da imagem (o teste lê as medidas do próprio JPEG, sem dependências); `og:image:alt` não está vazio.
- **`netlify.test.js`:** confere o que vai ao ar. As duas chaves do `netlify.toml` (`command` e `publish`) são lidas com expressões regulares simples, sem biblioteca de TOML. O `publish` é `dist` e o `cp -R` do comando copia para essa mesma pasta; cada caminho copiado existe no repositório (pega erro de digitação e um `og-image.jpg` esquecido); tudo o que o `index.html` usa (`href` e `src` locais e o caminho do `og:image`), o `MENU_URL` e o `PHOTOS_DIR` do `js/app.js` e os módulos que os `js/*.js` importam está coberto pela lista copiada; a lista não contém `docs`, `tests`, `scripts`, `.claude`, `fotos-originais`, `node_modules`, `package.json` nem `.git` (nem `.` ou `*`). Por fim, o comando de build roda de verdade numa cópia temporária do repositório (arquivos do Git, num diretório temporário apagado no fim) e o `dist/` tem `index.html`, `favicon.svg`, `og-image.jpg`, `css/style.css`, `js/app.js`, `js/whatsapp.js`, `data/menu.json` e `img/hero.webp`, e não tem `docs` nem `tests`. Esse último teste é pulado, com o motivo, onde faltam o `sh` ou o Git.
- **`app.js`:** busca o `menu.json` revalidando o cache a cada visita, para que uma mudança de preço apareça logo após a publicação, e um teste confere isso.
- **`photos.test.js`:** valida as fotos que existem em `img/`: cada arquivo tem de ser citado no `data/menu.json` (ou ser o `hero.webp`) e passar no `checkWebp` de `scripts/photo-lib.mjs` (container WebP íntegro, até 200 KB, sem EXIF nem XMP), a mesma checagem que o conversor faz ao gravar. A falta de uma foto não reprova: o teste lista os bolos ainda sem foto (e se o `hero.webp` já existe) sem falhar.
- **`photo-lib.test.js`:** as funções puras do conversor (`scripts/photo-lib.mjs`): quando reduzir (nunca ampliar; exatamente 800px não reduz), leitura de BMP de 24 e 32 bits (de baixo para cima e de cima para baixo, com a sobra de bytes no fim de cada linha), detecção das tarjas pretas (inclusive o caso real de 540x1158, com recorte de 4px, e a faixa de 5 linhas do `hero.png`, que passa do mínimo de 4px), correspondência exata do nome do arquivo com o `id` (maiúsculas, acento decomposto, arquivo oculto) e a validação do WebP (container, tamanho, EXIF e XMP). O limite de 200 KB (`MAX_BYTES`) tem um só lugar: o `photos.test.js` o importa dessa biblioteca.
- **`prepare-photos.test.js`:** de ponta a ponta. Gera PNGs sintéticos, roda o comando e confere as medidas e o conteúdo dos WebP gravados (tarjas recortadas no lugar certo, nada ampliado, rotação aplicada), os nomes ignorados, o erro de dois arquivos para o mesmo `id`, o `--dry-run` que não grava nada, o `--no-crop` (geral, por `id`, `id` desconhecido e um fundo quase preto), a gravação atômica (sem temporário sobrando, e um link simbólico no destino é substituído sem tocar no arquivo para onde apontava), o arquivo de origem vazio e as mensagens quando faltam `sips` ou `cwebp`. É pulado, com o motivo, onde essas ferramentas não existem; o `npm test` continua passando.
- **`tooling.test.js`:** guarda o que o `package.json`, o CI, o Biome e o Netlify combinam entre si, sem biblioteca de YAML nem de TOML (só expressões regulares). O `.nvmrc` tem uma versão do Node (`22`, `22.15` ou `22.15.0`); o `package.json` tem os scripts `test`, `lint` (só lê, não grava) e `lint:fix`, o Biome fixado em versão exata em `devDependencies` e nenhuma chave `dependencies`; o `ci.yml` usa `node-version-file: .nvmrc`, roda `npm ci` antes de `npm run lint` e de `npm test`, só dá a permissão `contents: read` e não usa `secrets.`; o `biome.json` liga o uso do `.gitignore` pelo Git e não inclui o `index.html`; e o `netlify.toml` tem `NPM_FLAGS = "--omit=dev"` em `[build.environment]`. O parser simples do `netlify.test.js` (`command` e `publish`) não se confunde com essa nova tabela.
- A aparência e a responsividade são conferidas abrindo a página em tamanho de celular, num servidor local.
- No runner Linux do CI não há `sips` nem `cwebp`, então os testes de ponta a ponta do conversor são pulados, com o motivo. É o esperado: ao mexer em `scripts/prepare-photos.mjs`, rode o `npm test` no Mac.

## Qualidade de código e CI/CD

### Biome

- É o único `devDependency` do projeto (`@biomejs/biome`, versão exata `2.6.4` no `package.json`, com o `package-lock.json` versionado). `npm ci` instala; o `npm test` não precisa dele.
- `npm run lint` (`biome check --error-on-warnings .`) só lê: confere o lint, a formatação e a ordem dos imports e sai com código diferente de zero se achar qualquer coisa. O `--error-on-warnings` é necessário porque, no Biome 2.6.4, achados como variável não usada são avisos, e o `biome check` sozinho sairia com código 0. `npm run lint:fix` (`biome check --write .`) aplica as correções seguras, a formatação e a ordem dos imports.
- Escopo (`files.includes` do `biome.json`): `js/`, `scripts/`, `tests/`, `css/`, `data/`, `package.json` e `biome.json`. Ficam de fora o `index.html`, `docs/`, os `*.md`, `.claude/`, `netlify.toml` e `package-lock.json`. O que o Git ignora (`node_modules/`, `dist/`, `fotos-originais/`) também fica de fora (`vcs.useIgnoreFile`).
- Estilo: o que o código já tinha (aspas simples, ponto e vírgula, 2 espaços, vírgula final, parênteses sempre nas arrow functions, fim de linha LF), com linhas de até 120 colunas. A largura foi escolhida medindo o código: os percentis 90, 95 e 99 das linhas de `js/`, `scripts/` e `tests/` são 92, 102 e 127 colunas, e 120 foi a largura que menos mexeu no código existente (cerca de 300 linhas alteradas, contra cerca de 720 com 100 colunas). Regras de lint: o conjunto `recommended`, sem grupos extras e sem regra desligada.
- `data/menu.json` fica sem formatador, de propósito: ele é mantido com um bolo por linha, para a mudança de um preço ser um diff de uma linha e para a edição à mão ser fácil, e o formatador do Biome espalharia cada bolo em várias linhas. O `biome.json` desliga o formatador só para esse arquivo (`overrides`); o linter continua valendo. O `biome.json` não aceita comentários, então o motivo fica aqui e no README.
- Exceções são pontuais e comentadas: `// biome-ignore format: <motivo>` nas três listas escritas à mão em grupos (os bytes do cabeçalho Exif em `tests/prepare-photos.test.js` e os argumentos do `sips` em `scripts/prepare-photos.mjs`). Para o lint, o formato é `// biome-ignore lint/<grupo>/<regra>: <motivo>`.

### CI e CD

1. **CI (GitHub Actions, `.github/workflows/ci.yml`).** Roda em todo push na `main` e em todo pull request, num `ubuntu-latest` com limite de 10 minutos: `actions/checkout`, `actions/setup-node` com `node-version-file: .nvmrc` e cache do npm, `npm ci`, `npm run lint` e `npm test`. Permissão só de leitura (`contents: read`), sem segredos, e um push novo na mesma branch cancela a execução anterior (`concurrency`). Os testes de ponta a ponta do conversor são pulados no Linux (veja "Testes").
2. **Dependabot (`.github/dependabot.yml`).** Toda semana, até 3 PRs por ecossistema (`github-actions` e `npm`) para manter as versões das actions e o Biome fixado em dia. Uma versão nova do Biome pode pedir `biome migrate`; o CI do PR mostra.
3. **CD (Netlify, `netlify.toml`).** Cada push na `main` dispara o build do Netlify, que copia só os arquivos do site para `dist/` e publica essa pasta em https://delicias-da-ca.netlify.app/. O `NPM_FLAGS = "--omit=dev"` evita que o Netlify instale o Biome, já que a página não usa pacote nenhum.

O fluxo é: push ou pull request, CI (checkout, Node do `.nvmrc`, `npm ci`, `npm run lint`, `npm test`), merge na `main`, build do Netlify e site no ar. A ordem entre o CI e o merge é uma convenção, não uma trava: o Netlify publica o que chegar na `main` e não espera o CI. Por isso o workflow não tem passo de deploy (o GitHub não guarda token do Netlify nem segredo algum), e recomenda-se proteger a `main` no GitHub, exigindo pull request e o job `check` do workflow `CI`. Essa proteção é uma configuração do GitHub, que o repositório não consegue impor sozinho.

Localmente, o equivalente é `nvm use` (lê o `.nvmrc`), `npm run lint` e `npm test`.

## Como rodar localmente

O navegador bloqueia a leitura do JSON e também os módulos JavaScript quando o `index.html` é aberto com duplo clique, e a página fica sem cardápio (só o título). Para ver o site, use um servidor local, por exemplo `python3 -m http.server`, e abra `http://localhost:8000`. No Netlify isso funciona sem ajuste.

A versão do Node vem do `.nvmrc` (`nvm use`). O `npm test` não precisa de instalação; o `npm ci` só é necessário para rodar o lint e a formatação (`npm run lint`, `npm run lint:fix`).

## Fora do escopo

Carrinho, filtros e busca, painel de edição, pagamento online, frete por bairro, várias páginas, estatísticas de acesso.

## Cuidados com o repositório

- A pasta `.superpowers/` (usada só nesta fase de design) entra no `.gitignore`.
- Os dois prints na raiz (`Screenshot 2026-10-29 at ...png`) são material de referência e mostram o WhatsApp Web pessoal. Eles não devem ir para o site publicado nem para o repositório público. Devem sair da raiz ou ser ignorados (o `.gitignore` os ignora, e o build do Netlify só copia os arquivos da lista do `netlify.toml`, então a raiz nunca é publicada por inteiro).
- A pasta `fotos-originais/` (as fotos enviadas, antes da otimização) entra no `.gitignore`: só as versões otimizadas de `img/` vão para o repositório.
- A pasta `dist/`, gerada pelo build do Netlify, também entra no `.gitignore`, assim como `node_modules/`. O `package-lock.json`, ao contrário, é versionado: o CI instala com `npm ci`, que exige o arquivo e instala exatamente o que ele lista (inclusive os binários do Biome para Linux, que o Ubuntu do CI precisa).

## Pontos em aberto

- **Horários:** a imagem original está cortada no fim. A leitura acima precisa de confirmação da Cá.
- **Grafia:** o nome está como no cardápio ("Delicias da Cá", sem acento no "i"). Confirmar se é intencional.
- **Fotos:** a foto de destaque do topo (`hero.webp`) já está no repositório e chegaram 10 das 18 fotos de bolos. Faltam 8: `cenoura`, `cenoura-vulcao`, `chocolate`, `chocolate-chocolate`, `fuba`, `fuba-cremoso`, `milho` e `pacoca`. Cada foto nova precisa vir com o sabor identificado.
- **Site no Netlify:** o site foi criado com o nome `delicias-da-ca` (https://delicias-da-ca.netlify.app/, plano gratuito), e as tags `og:url` e `og:image` do `index.html` usam esse endereço; se o nome mudar, as duas precisam do endereço novo, porque o WhatsApp busca a imagem da prévia pelo endereço escrito nelas. Falta testar a prévia do link enviando-o a si mesmo no WhatsApp (acrescentar `?v=2` ao link para repetir o teste).
- **Primeira execução do CI:** o workflow não pôde ser executado offline. Depois do primeiro push, abrir a aba Actions do GitHub e conferir que o job `check` passa (o selo do README só mostra o estado depois de uma execução na `main`). As versões `v4` das actions (`actions/checkout` e `actions/setup-node`) são válidas, mas pode haver versões mais novas, que não deu para consultar sem rede; o Dependabot propõe a atualização.
- **`NPM_FLAGS` no Netlify:** falta confirmar, no log do primeiro deploy, que o Netlify respeita o `NPM_FLAGS = "--omit=dev"` (nenhuma instalação do Biome deve aparecer).
- **Proteger a `main`:** recomendação, não feita pelo repositório: exigir pull request e o job `check` antes do merge.
