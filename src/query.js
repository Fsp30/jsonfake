const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const RESERVED = ['_page', '_limit', '_sort', '_order', '_start', '_end', 'q'];

function applyFilters(items, query) {
  let result = items;

  if (query.q) {
    const q = String(query.q).toLowerCase();
    result = result.filter((i) => JSON.stringify(i).toLowerCase().includes(q));
  }

  for (const [key, raw] of Object.entries(query)) {
    if (RESERVED.includes(key)) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    const m = key.match(/^(.+)_(gte|lte|ne|like)$/);
    const field = m ? m[1] : key;
    const op = m ? m[2] : 'eq';

    result = result.filter((item) => {
      const v = getPath(item, field);
      return values.some((t) => {
        switch (op) {
          case 'gte': return v >= (isNaN(t) ? t : Number(t));
          case 'lte': return v <= (isNaN(t) ? t : Number(t));
          case 'ne': return String(v) !== String(t);
          case 'like': return String(v).toLowerCase().includes(String(t).toLowerCase());
          default: return String(v) === String(t);
        }
      });
    });
  }
  return result;
}

function applySortAndPage(items, query, res) {
  let result = items;

  if (query._sort) {
    const fields = String(query._sort).split(',');
    const orders = String(query._order || '').split(',');
    result = [...result].sort((a, b) => {
      for (let i = 0; i < fields.length; i++) {
        const dir = (orders[i] || 'asc').toLowerCase() === 'desc' ? -1 : 1;
        const av = getPath(a, fields[i]);
        const bv = getPath(b, fields[i]);
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    });
  }

  res.set('X-Total-Count', String(result.length));
  res.set('Access-Control-Expose-Headers', 'X-Total-Count');

  if (query._page || query._limit) {
    const limit = Number(query._limit) || 10;
    const page = Number(query._page) || 1;
    result = result.slice((page - 1) * limit, page * limit);
  } else if (query._start != null || query._end != null) {
    result = result.slice(Number(query._start) || 0, query._end != null ? Number(query._end) : undefined);
  }
  return result;
}

function findForeignKey(childItems, parentName) {
  const sample = childItems[0];
  if (!sample) return null;
  const p = parentName.toLowerCase();
  return (
    Object.keys(sample).find((k) => {
      if (!/^id[A-Z]/.test(k)) return false;
      const base = k.slice(2).toLowerCase();
      return p.startsWith(base) && p.length - base.length <= 2;
    }) || null
  );
}

module.exports = { applyFilters, applySortAndPage, findForeignKey };