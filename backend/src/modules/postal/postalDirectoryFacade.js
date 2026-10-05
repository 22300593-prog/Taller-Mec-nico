const postalCode = (value) => {
  if (!/^\d{5}$/.test(value || '')) {
    const error = new Error('El código postal debe tener exactamente 5 dígitos.');
    error.statusCode = 400;
    throw error;
  }
  return value;
};

const positiveId = (value, label) => {
  if (!/^\d+$/.test(String(value || ''))) {
    const error = new Error(`${label} no es válido.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
};

const text = (value, label) => {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 180) {
    const error = new Error(`${label} no es válido.`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
};

const coloniesFrom = (rows) => [...new Map(rows.map((row) => [row.d_asenta, row])).values()]
  .map((row) => ({
    name: row.d_asenta,
    postalCodes: [...new Set(rows.filter((item) => item.d_asenta === row.d_asenta).map((item) => item.d_codigo))].sort()
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));

/** Vista -> Facade -> Repository para direcciones postales SEPOMEX. */
export class PostalDirectoryFacade {
  constructor(repository) {
    this.repository = repository;
  }

  async states() {
    return (await this.repository.states()).map(({ id, name }) => ({ id, name }));
  }

  async municipalities(stateId) {
    return (await this.repository.municipalities(positiveId(stateId, 'El estado')))
      .map(({ id, name }) => ({ id, name }));
  }

  async byPostalCode(value) {
    const code = postalCode(value);
    const rows = await this.repository.byPostalCode(code);
    if (!rows.length) return { state: null, municipality: null, colonies: [] };
    return {
      state: rows[0].d_estado,
      municipality: rows[0].d_mnpio,
      colonies: coloniesFrom(rows)
    };
  }

  async colonies(state, municipality) {
    const rows = await this.repository.byStateAndMunicipality(text(state, 'El estado'), text(municipality, 'El municipio'));
    return coloniesFrom(rows);
  }
}
