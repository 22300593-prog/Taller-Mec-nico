import { mkdir } from 'node:fs/promises';

const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fail = (message) => { const error = new Error(message); error.statusCode = 400; throw error; };
const clean = (value, label, max = 180) => { const normalized = value?.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-MX'); if (!normalized || normalized.length > max) fail(`${label} es obligatorio o excede el límite permitido.`); return normalized; };
const phone = (value) => { const digits = value?.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, ''); if (!/^\d{10}$/.test(digits || '')) fail('El teléfono debe contener 10 dígitos mexicanos.'); return digits; };

export class WorkshopFacade {
  constructor(repository) { this.repository = repository; }
  normalize(input) {
    const rfc = clean(input.rfc, 'El RFC', 13);
    if (!rfcPattern.test(rfc)) fail('El RFC no tiene un formato mexicano válido.');
    const contactEmail = input.contactEmail?.trim().toLowerCase();
    if (!emailPattern.test(contactEmail || '')) fail('El email de contacto no tiene un formato válido.');
    if (!/^\d{5}$/.test(input.postalCode || '')) fail('El código postal debe tener 5 dígitos.');
    return { name: clean(input.name, 'El nombre del taller', 160), street: clean(input.street, 'La calle', 160), neighborhood: clean(input.neighborhood, 'La colonia', 120), postalCode: input.postalCode, state: clean(input.state, 'El estado', 120), municipality: clean(input.municipality, 'El municipio', 120), locality: clean(input.locality, 'La localidad', 120), legalName: clean(input.legalName, 'La razón social', 180), phone: phone(input.phone), rfc, contactEmail, status: input.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' };
  }
  async create(input, photo) {
    const workshop = this.normalize(input); const duplicate = await this.repository.findDuplicate(workshop);
    if (duplicate) return { ok: false, statusCode: 409, message: 'Ya existe un taller con el mismo RFC, razón social o dirección.' };
    const id = await this.repository.create({ ...workshop, photoFilename: photo?.filename || null });
    return { ok: true, id, workshop };
  }
  async update(id, input, photo) {
    const workshop = this.normalize(input); const duplicate = await this.repository.findDuplicate(workshop, id);
    if (duplicate) return { ok: false, statusCode: 409, message: 'Ya existe un taller con el mismo RFC, razón social o dirección.' };
    if (!await this.repository.update(id, { ...workshop, photoFilename: photo?.filename || null })) return { ok: false, statusCode: 404, message: 'Taller no encontrado.' };
    return { ok: true, workshop };
  }
}
