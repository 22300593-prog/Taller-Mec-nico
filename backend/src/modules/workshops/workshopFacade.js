import { RFC_PATTERN, fail, requiredText, validEmail, validPhone, validPostalCode } from '../../shared/customerValidation.js';

export class WorkshopFacade {
  constructor(repository) { this.repository = repository; }
  normalize(input) {
    const rfc = requiredText(input.rfc, 'El RFC', 13);
    if (!RFC_PATTERN.test(rfc)) fail('El RFC no tiene un formato mexicano válido.');
    return { name: requiredText(input.name, 'El nombre del taller', 160), street: requiredText(input.street, 'La calle', 160), neighborhood: requiredText(input.neighborhood, 'La colonia', 120), postalCode: validPostalCode(input.postalCode), state: requiredText(input.state, 'El estado', 120), municipality: requiredText(input.municipality, 'El municipio', 120), locality: requiredText(input.locality, 'La localidad', 120), legalName: requiredText(input.legalName, 'La razón social', 180), phone: validPhone(input.phone, 'El teléfono'), rfc, contactEmail: validEmail(input.contactEmail, 'El email de contacto'), status: input.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' };
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
