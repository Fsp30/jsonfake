const path = require('path');
const express = require('express');
const cors = require('cors');
const { listNames, load } = require('./src/databases');
const { applyFilters, applySortAndPage, findForeignKey } = require('./src/query');

const PORT = process.env.PORT || 3000;
const app = express();

app.set('trust proxy', true);

app.use(cors());

app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(405).json({ error: 'Somente GET é permitido' });
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

app.listen(PORT, () => {
  console.log(`jsonfake rodando em http://localhost:${PORT}`);
  console.log(`Bases: ${listNames().join(', ') || '(nenhuma em db/)'}`);
});