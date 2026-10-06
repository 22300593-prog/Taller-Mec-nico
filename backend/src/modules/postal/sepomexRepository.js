const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Adaptador del catálogo SEPOMEX. El proveedor puede reemplazarse mediante
 * SEPOMEX_API_URL por una instancia institucional o autoalojada.
 */
export class SepomexRepository {
  constructor(db, baseUrl = process.env.SEPOMEX_API_URL || 'https://sepomex.kurenn.dev/api/v1') {
    this.db = db;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cache = new Map();
  }

  async states() {
    return this.cached('states', () => this.collection('/states'), 'states');
  }

  async municipalities(stateId) {
    return this.cached(`municipalities:${stateId}`, async () => {
      const data = await this.request(`/states/${stateId}/municipalities`);
      return data.municipalities || [];
    }, 'municipalities');
  }

  async byPostalCode(postalCode) {
    return this.cached(`postal-code:${postalCode}`, async () => {
      const rows = await this.collection('/zip_codes', { zip_code: postalCode });
      return rows.filter((row) => row.d_codigo === postalCode);
    }, 'postal-code');
  }

  async byStateAndMunicipality(state, municipality) {
    return this.cached(`municipality:${state}:${municipality}`, () => this.collection('/zip_codes', { state, city: municipality }), 'municipality');
  }

  async collection(path, query = {}) {
    const first = await this.request(path, { ...query, per_page: 200, page: 1 });
    const key = Object.keys(first).find((name) => Array.isArray(first[name]));
    const rows = key ? first[key] : [];
    const totalPages = first.meta?.pagination?.total_pages || 1;

    for (let page = 2; page <= totalPages; page += 1) {
      const next = await this.request(path, { ...query, per_page: 200, page });
      rows.push(...(key ? next[key] || [] : []));
    }
    return rows;
  }

  async cached(key, loader, kind) {
    const current = this.cache.get(key);
    if (current && current.expiresAt > Date.now()) return current.value;
    const persisted = await this.readPersisted(key);
    if (persisted) {
      this.cache.set(key, { value: persisted, expiresAt: Date.now() + CACHE_TTL_MS });
      return persisted;
    }
    const value = await loader();
    await this.savePersisted(key, kind, value);
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  /** Conserva solo respuestas solicitadas, no la base nacional completa de SEPOMEX. */
  async readPersisted(key) {
    const [rows] = await this.db.execute('SELECT payload FROM sepomex_cache WHERE cache_key=?', [key]);
    if (!rows[0]) return null;
    try { return typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload; }
    catch { return null; }
  }

  async savePersisted(key, kind, payload) {
    await this.db.execute(
      `INSERT INTO sepomex_cache(cache_key,cache_kind,payload) VALUES(?,?,?)
       ON DUPLICATE KEY UPDATE cache_kind=VALUES(cache_kind),payload=VALUES(payload),updated_at=CURRENT_TIMESTAMP`,
      [key, kind, JSON.stringify(payload)]
    );
  }

  async request(path, query = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`SEPOMEX respondió ${response.status}`);
      return await response.json();
    } catch (error) {
      const unavailable = new Error('El catálogo SEPOMEX no está disponible. Intenta nuevamente.');
      unavailable.statusCode = 503;
      unavailable.cause = error;
      throw unavailable;
    }
  }
}
