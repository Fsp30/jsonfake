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

## Rodar
```bash
npm install
npm start
```

## Interface

Abra a raiz do servidor no navegador: lista as bases e os recursos, mostra a resposta em tabela ou JSON, e a barra de requisição exibe a rota exata para usar no código. O endereço da página (`/#/ecommerce/produtos?_limit=5`) pode ser compartilhado.

