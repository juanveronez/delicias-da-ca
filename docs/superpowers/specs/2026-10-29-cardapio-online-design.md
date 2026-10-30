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
| Tecnologia | HTML, CSS e JavaScript puros, sem build e sem framework. |
| Dados | Os bolos ficam em `data/menu.json`, só dados, sem código. |
| Publicação | Netlify, plano gratuito, em https://delicias-da-ca.netlify.app/. O Netlify publica só os arquivos listados no `netlify.toml` (copiados para `dist/`), não o repositório inteiro. |

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
netlify.toml               → o que o Netlify publica: copia só os arquivos do site para dist/
css/style.css
data/menu.json
js/whatsapp.js             → funções puras: montar o link e formatar o preço
js/app.js                  → busca o JSON, monta os cards, trata erros
scripts/photo-lib.mjs      → funções puras do conversor de fotos
scripts/prepare-photos.mjs → converte as fotos de fotos-originais/ para img/*.webp
img/                       → fotos otimizadas
tests/                     → testes
.gitignore                 → ignora, entre outros, dist/ (a pasta que o build do Netlify gera)
package.json               → só "name", "private", "type" e o script "test"; sem dependências
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

Usam o executor do próprio Node (`node --test`), sem instalar nada.

- **Link do WhatsApp:** número correto, mensagem codificada, nome com acento e com espaço (ex.: "Paçoca vulcão"), botão geral sem bolo.
- **Preço:** `50` vira `R$ 50,00`; `30` vira `R$ 30,00`.
- **`menu.json`:** é um JSON válido (o que pega a vírgula sobrando antes de publicar), e cada item tem `id`, `name`, `price` (número positivo) e `photo`, que tem de ser o `id` mais `.webp`. A quantidade de bolos é conferida contra uma constante nomeada (`EXPECTED_COUNT`), e `id` repetido é reportado pelo nome.
- **`index.html`:** todos os links do WhatsApp são o link geral, e a quantidade deles é conferida contra uma constante nomeada (`EXPECTED_WHATSAPP_LINK_COUNT`). Os links que abrem em nova aba têm `rel="noopener noreferrer"`. O aviso de erro começa oculto e o `<noscript>` oferece o WhatsApp. O favicon (`favicon.svg`) referenciado no `<head>` tem de existir. A prévia do link é conferida: `og:url` é uma URL `https://` absoluta que termina em `/`; `og:image` é absoluta, na mesma origem do `og:url`, e o caminho dela existe como arquivo na raiz do repositório; esse arquivo é JPEG ou PNG (conferido pelos primeiros bytes) e tem até 300 KB; `og:image:width` e `og:image:height` são numéricos e iguais às medidas reais da imagem (o teste lê as medidas do próprio JPEG, sem dependências); `og:image:alt` não está vazio.
- **`netlify.test.js`:** confere o que vai ao ar. As duas chaves do `netlify.toml` (`command` e `publish`) são lidas com expressões regulares simples, sem biblioteca de TOML. O `publish` é `dist` e o `cp -R` do comando copia para essa mesma pasta; cada caminho copiado existe no repositório (pega erro de digitação e um `og-image.jpg` esquecido); tudo o que o `index.html` usa (`href` e `src` locais e o caminho do `og:image`), o `MENU_URL` e o `PHOTOS_DIR` do `js/app.js` e os módulos que os `js/*.js` importam está coberto pela lista copiada; a lista não contém `docs`, `tests`, `scripts`, `.claude`, `fotos-originais`, `node_modules`, `package.json` nem `.git` (nem `.` ou `*`). Por fim, o comando de build roda de verdade numa cópia temporária do repositório (arquivos do Git, num diretório temporário apagado no fim) e o `dist/` tem `index.html`, `favicon.svg`, `og-image.jpg`, `css/style.css`, `js/app.js`, `js/whatsapp.js`, `data/menu.json` e `img/hero.webp`, e não tem `docs` nem `tests`. Esse último teste é pulado, com o motivo, onde faltam o `sh` ou o Git.
- **`app.js`:** busca o `menu.json` revalidando o cache a cada visita, para que uma mudança de preço apareça logo após a publicação, e um teste confere isso.
- **`photos.test.js`:** valida as fotos que existem em `img/`: cada arquivo tem de ser citado no `data/menu.json` (ou ser o `hero.webp`) e passar no `checkWebp` de `scripts/photo-lib.mjs` (container WebP íntegro, até 200 KB, sem EXIF nem XMP), a mesma checagem que o conversor faz ao gravar. A falta de uma foto não reprova: o teste lista os bolos ainda sem foto (e se o `hero.webp` já existe) sem falhar.
- **`photo-lib.test.js`:** as funções puras do conversor (`scripts/photo-lib.mjs`): quando reduzir (nunca ampliar; exatamente 800px não reduz), leitura de BMP de 24 e 32 bits (de baixo para cima e de cima para baixo, com a sobra de bytes no fim de cada linha), detecção das tarjas pretas (inclusive o caso real de 540x1158, com recorte de 4px, e a faixa de 5 linhas do `hero.png`, que passa do mínimo de 4px), correspondência exata do nome do arquivo com o `id` (maiúsculas, acento decomposto, arquivo oculto) e a validação do WebP (container, tamanho, EXIF e XMP). O limite de 200 KB (`MAX_BYTES`) tem um só lugar: o `photos.test.js` o importa dessa biblioteca.
- **`prepare-photos.test.js`:** de ponta a ponta. Gera PNGs sintéticos, roda o comando e confere as medidas e o conteúdo dos WebP gravados (tarjas recortadas no lugar certo, nada ampliado, rotação aplicada), os nomes ignorados, o erro de dois arquivos para o mesmo `id`, o `--dry-run` que não grava nada, o `--no-crop` (geral, por `id`, `id` desconhecido e um fundo quase preto), a gravação atômica (sem temporário sobrando, e um link simbólico no destino é substituído sem tocar no arquivo para onde apontava), o arquivo de origem vazio e as mensagens quando faltam `sips` ou `cwebp`. É pulado, com o motivo, onde essas ferramentas não existem; o `npm test` continua passando.
- A aparência e a responsividade são conferidas abrindo a página em tamanho de celular, num servidor local.

## Como rodar localmente

O navegador bloqueia a leitura do JSON e também os módulos JavaScript quando o `index.html` é aberto com duplo clique, e a página fica sem cardápio (só o título). Para ver o site, use um servidor local, por exemplo `python3 -m http.server`, e abra `http://localhost:8000`. No Netlify isso funciona sem ajuste.

## Fora do escopo

Carrinho, filtros e busca, painel de edição, pagamento online, frete por bairro, várias páginas, estatísticas de acesso.

## Cuidados com o repositório

- A pasta `.superpowers/` (usada só nesta fase de design) entra no `.gitignore`.
- Os dois prints na raiz (`Screenshot 2026-10-29 at ...png`) são material de referência e mostram o WhatsApp Web pessoal. Eles não devem ir para o site publicado nem para o repositório público. Devem sair da raiz ou ser ignorados (o `.gitignore` os ignora, e o build do Netlify só copia os arquivos da lista do `netlify.toml`, então a raiz nunca é publicada por inteiro).
- A pasta `fotos-originais/` (as fotos enviadas, antes da otimização) entra no `.gitignore`: só as versões otimizadas de `img/` vão para o repositório.
- A pasta `dist/`, gerada pelo build do Netlify, também entra no `.gitignore`.

## Pontos em aberto

- **Horários:** a imagem original está cortada no fim. A leitura acima precisa de confirmação da Cá.
- **Grafia:** o nome está como no cardápio ("Delicias da Cá", sem acento no "i"). Confirmar se é intencional.
- **Fotos:** a foto de destaque do topo (`hero.webp`) já está no repositório e chegaram 10 das 18 fotos de bolos. Faltam 8: `cenoura`, `cenoura-vulcao`, `chocolate`, `chocolate-chocolate`, `fuba`, `fuba-cremoso`, `milho` e `pacoca`. Cada foto nova precisa vir com o sabor identificado.
- **Site no Netlify:** o site foi criado com o nome `delicias-da-ca` (https://delicias-da-ca.netlify.app/, plano gratuito), e as tags `og:url` e `og:image` do `index.html` usam esse endereço; se o nome mudar, as duas precisam do endereço novo, porque o WhatsApp busca a imagem da prévia pelo endereço escrito nelas. Falta testar a prévia do link enviando-o a si mesmo no WhatsApp (acrescentar `?v=2` ao link para repetir o teste).
