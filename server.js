const path = require('path');
const express = require('express');
const cors = require('cors');
const { listNames, load } = require('./src/databases');
const { applyFilters, applySortAndPage, findForeignKey } = require('./src/query');

const PORT = process.env.PORT || 3000;
const app = express();

app.set('trust proxy', true);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!['GET', 'PUT', 'DELETE', 'POST', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(405).json({ error: 'Falha no processamento' });
  }
  next();
});

app.param('db', (req, res, next, name) => {
  const result = load(name);
  if (result.error === 'not_found') {
    return res.status(404).json({ error: `Base "${name}" não encontrada`, disponiveis: listNames() });
  }
  if (result.error === 'invalid') {
    return res.status(500).json({ error: `Base "${name}" tem JSON inválido`, detalhe: result.message });
  }
  req.db = result.data;
  next();
});

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

app.get('/', (req, res) => {
  res.vary('Accept');
  if (req.accepts(['json', 'html']) === 'html') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  res.json(
    listNames().map((name) => {
      const r = load(name);
      return r.error
        ? { nome: name, url: `${baseUrl(req)}/${name}`, status: 'JSON_INVALIDO', detalhe: r.message }
        : { nome: name, url: `${baseUrl(req)}/${name}`, status: 'OK', recursos: Object.keys(r.data).length };
    })
  );
});

app.get('/:db', (req, res) => {
  res.json(
    Object.fromEntries(
      Object.entries(req.db).map(([name, v]) => [
        name,
        { total: Array.isArray(v) ? v.length : 1, url: `${baseUrl(req)}/${req.params.db}/${name}` },
      ])
    )
  );
});

app.get('/:db/:resource', (req, res) => {
  const data = req.db[req.params.resource];
  if (data === undefined) return res.status(404).json({ error: 'Recurso não encontrado' });
  if (!Array.isArray(data)) return res.json(data);
  res.json(applySortAndPage(applyFilters(data, req.query), req.query, res));
});

app.get('/:db/:resource/:id', (req, res) => {
  const data = req.db[req.params.resource];
  if (!Array.isArray(data)) return res.status(404).json({ error: 'Recurso não encontrado' });
  const item = data.find((i) => String(i.id) === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  res.json(item);
});

app.get('/:db/:resource/:id/:child', (req, res) => {
  const { resource, id, child } = req.params;
  if (!Array.isArray(req.db[resource]) || !Array.isArray(req.db[child])) {
    return res.status(404).json({ error: 'Recurso não encontrado' });
  }
  const fk = findForeignKey(req.db[child], resource);
  if (!fk) return res.status(404).json({ error: `Sem relação entre ${child} e ${resource}` });
  const items = req.db[child].filter((i) => String(i[fk]) === id);
  res.json(applySortAndPage(applyFilters(items, req.query), req.query, res));
});

app.put('/:db/:resource/:id', (req, res) => {
  const { resource, id } = req.params;
  let data = req.db[resource];

  // Se o recurso não existir ou não for uma lista, não há como aglomerar
  if (!Array.isArray(data)) {
    return res.status(404).json({ error: 'Recurso não encontrado ou inválido para edição' });
  }

  // Mapeia os dados substituindo o item editado pelo conteúdo do req.body
  const updatedData = data.map((item) => {
    if (String(item.id) === id) {
      return { ...item, ...req.body, id: item.id }; // Garante que o ID original seja mantido/mesclado
    }
    return item;
  });

  // Retorna o aglomerado completo dos dados com status 200 OK ou 202 Accepted
  res.status(200).json(updatedData);
});

app.post('/:db/:resource', (req, res) => {
  const { resource } = req.params;
  let data = req.db[resource];

  // Se o recurso não existir no banco, inicializa como uma lista vazia
  if (!data) {
    data = [];
  } else if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'O recurso destino não é uma lista' });
  }

  // Cria o novo item combinando o body recebido
  const newItem = { ...req.body };

  // Opcional: Gera um ID incremental simples caso o body não envie um
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => (Number(item.id) > max ? Number(item.id) : max), 0);
    newItem.id = maxId + 1;
  }

  // Aglomera os dados antigos com o novo item incluído
  const updatedData = [...data, newItem];

  // Retorna o aglomerado completo dos dados com status 201 Created
  res.status(201).json(updatedData);
});

app.delete('/:db/:resource/:id', (req, res) => {
  res.status(204).send();
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`jsonfake rodando em http://localhost:${PORT}`);
  console.log(`Bases: ${listNames().join(', ') || '(nenhuma em db/)'}`);
});
