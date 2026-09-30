# jsonfake

API REST somente leitura (GET) gerada a partir de arquivos JSON.

## Adicionar uma base

1. Crie `db/<nome>.json` (o nome do arquivo vira a rota; nomes distintos = rotas distintas).
2. A raiz deve ser um objeto, com cada recurso sendo um array de objetos com `id`:
   ```json
   { "tarefas": [{ "id": 1, "titulo": "Estudar" }] }
   ```
3. Pronto, nenhum código precisa ser alterado: `GET /<nome>/tarefas`.

## Rotas

| Rota | Retorno |
|---|---|
| `GET /` | interface web no navegador; lista de bases em JSON para clientes de API (`Accept: application/json` ou curl) |
| `GET /:db` | recursos da base |
| `GET /:db/:recurso` | lista |
| `GET /:db/:recurso/:id` | item |
| `GET /:db/:recurso/:id/:filho` | filhos via chave `id<Recurso>` (ex.: `/ecommerce/pedidos/1/subpedidos`) |

Query params: `?campo=v`, `campo_gte`, `campo_lte`, `campo_ne`, `campo_like`, `q`, `_sort`, `_order`, `_page`, `_limit` (total em `X-Total-Count`).

Exemplo:

    fetch('https://jsonfake-etv6.onrender.com/ecommerce/produtos')
      .then(r => r.json())
      .then(console.log)

## Rodar
```bash
npm install
npm start
```


**Interface:** https://jsonfake-etv6.onrender.com

> O serviço roda no plano gratuito e hiberna sem uso: a primeira requisição pode levar alguns segundos.
> Use apenas dados fictícios nas bases.
