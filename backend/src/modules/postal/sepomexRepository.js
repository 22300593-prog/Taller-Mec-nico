const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Adaptador del catálogo SEPOMEX. El proveedor puede reemplazarse mediante
 * SEPOMEX_API_URL por una instancia institucional o autoalojada.
 */
export class SepomexRepository {
  constructor(baseUrl = process.env.SEPOMEX_API_URL || 'https://sepomex.kurenn.dev/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cache = new Map();
  }

  async states() {
    return this.cached('states', () => this.collection('/states'));
  }

  async municipalities(stateId) {
    return this.cached(`municipalities:${stateId}`, async () => {
      const data = await this.request(`/states/${stateId}/municipalities`);
      return data.municipalities || [];
    });
  }

  async byPostalCode(postalCode) {
    const rows = await this.collection('/zip_codes', { zip_code: postalCode });
    return rows.filter((row) => row.d_codigo === postalCode);
  }

  async byStateAndMunicipality(state, municipality) {
    return this.collection('/zip_codes', { state, city: municipality });
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

  async cached(key, loader) {
    const current = this.cache.get(key);
    if (current && current.expiresAt > Date.now()) return current.value;
    const value = await loader();
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
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
