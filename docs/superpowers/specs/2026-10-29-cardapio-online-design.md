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
| Publicação | GitHub Pages ou Netlify, gratuitos. A escolha fica para o fim e não muda o código. |

## Convenções de código

- Todo o código fica em inglês: identificadores (variáveis, funções e constantes), comentários, descrições e mensagens dos testes, nomes de arquivo, chaves do JSON, ids do HTML, classes e propriedades personalizadas do CSS e mensagens de console.
- Só fica em português o que o usuário final vê: os textos, títulos e rótulos da página, a mensagem do WhatsApp, os atributos `alt` e `aria-label`, o `<title>`, a meta description e as tags Open Graph, os avisos e o `name` de cada bolo.
- Exceção deliberada: os valores de `id` dos bolos (por exemplo, `cenoura-vulcao`) e os nomes das fotos derivados deles (`cenoura-vulcao.webp`) seguem o nome do produto, em português. O mesmo vale para `lang="pt-BR"` e `Intl.NumberFormat('pt-BR', ...)`.
- A documentação (README, spec e plano) continua em português, mas todo identificador, caminho, classe ou chave citado nela usa os nomes em inglês.

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
- `photo`: nome do arquivo dentro de `img/`.

## Link do WhatsApp

- Formato: `https://wa.me/5519996851415?text=<mensagem codificada com encodeURIComponent>`.
- Mensagem de cada bolo: `Olá, Cá! Vim pelo cardápio online e quero encomendar o bolo de {name} ({price}).`
- Mensagem do botão geral: `Olá, Cá! Vim pelo cardápio online e gostaria de fazer uma encomenda.`
- Os links abrem em nova aba, com `rel="noopener noreferrer"`.

## Arquivos

```
index.html
css/style.css
data/menu.json
js/whatsapp.js       → funções puras: montar o link e formatar o preço
js/app.js            → busca o JSON, monta os cards, trata erros
img/                 → fotos otimizadas
tests/               → testes
package.json         → só {"type":"module"} e o script "test"; sem dependências
```

`js/whatsapp.js` é um módulo ES, carregado pelo navegador por `<script type="module">` e importado pelos testes no Node.

## Fotos

- Uma foto por bolo em `img/<id>.webp`, com cerca de 800px de largura.
- A otimização é feita antes de entrar no repositório. Os prints enviados têm uns 5 MB cada, grandes demais para o site.
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

A página tem `title`, `meta description` e tags Open Graph (`og:title`, `og:description`, `og:image`). Assim o link aparece com prévia quando for enviado no WhatsApp ou no Instagram. O `og:image` precisa de uma URL absoluta, que só existe depois da publicação.

## Acessibilidade

- O verde do mockup (`#5b8a3c`) com texto branco dá cerca de 4:1 de contraste, abaixo dos 4,5:1 recomendados para texto pequeno. O botão usa um verde mais escuro, de modo que atinja 4,5:1 ou mais.
- Os botões são links (`<a>`) com área de toque de pelo menos 44px de altura.
- O texto do corpo tem tamanho confortável no celular, sem exigir zoom.

## Testes

Usam o executor do próprio Node (`node --test`), sem instalar nada.

- **Link do WhatsApp:** número correto, mensagem codificada, nome com acento e com espaço (ex.: "Paçoca vulcão"), botão geral sem bolo.
- **Preço:** `50` vira `R$ 50,00`; `30` vira `R$ 30,00`.
- **`menu.json`:** é um JSON válido, e cada item tem `id`, `name`, `price` (número positivo) e `photo`, que tem de ser o `id` mais `.webp`. A quantidade de bolos é conferida contra uma constante nomeada (`EXPECTED_COUNT`) e `id` repetido é reportado pelo nome, o que pega a vírgula sobrando antes de publicar.
- A aparência e a responsividade são conferidas abrindo a página em tamanho de celular, num servidor local.

## Como rodar localmente

O navegador bloqueia a leitura do JSON quando o `index.html` é aberto com duplo clique. Para ver o site, use um servidor local, por exemplo `python3 -m http.server`, e abra `http://localhost:8000`. No GitHub Pages e no Netlify isso funciona sem ajuste.

## Fora do escopo

Carrinho, filtros e busca, painel de edição, pagamento online, frete por bairro, várias páginas, estatísticas de acesso.

## Cuidados com o repositório

- A pasta `.superpowers/` (usada só nesta fase de design) entra no `.gitignore`.
- Os dois prints na raiz (`Screenshot 2026-10-29 at ...png`) são material de referência e mostram o WhatsApp Web pessoal. Eles não devem ir para o site publicado nem para o repositório público. Devem sair da raiz ou ser ignorados.

## Pontos em aberto

- **Horários:** a imagem original está cortada no fim. A leitura acima precisa de confirmação da Cá.
- **Grafia:** o nome está como no cardápio ("Delicias da Cá", sem acento no "i"). Confirmar se é intencional.
- **Fotos:** falta receber as 18 fotos, com o sabor de cada uma identificado.
- **Hospedagem e endereço:** GitHub Pages ou Netlify, e se haverá domínio próprio. Isso define a URL do `og:image`.
