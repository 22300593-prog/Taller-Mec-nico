import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { CURP_PATTERN, RFC_PATTERN, calculateAge, fail, requiredText, validEmail, validPhone, validPostalCode } from '../../shared/customerValidation.js';

/** Reglas de negocio de la Fase 3; los datos normalizados no dependen de la vista. */
export class CustomerAdministrationFacade {
  constructor(repository, photosDirectory) { this.repository = repository; this.photosDirectory = photosDirectory; }

  normalize(input) {
    const curp = requiredText(input.curp, 'La CURP', 18);
    const rfc = requiredText(input.rfc, 'El RFC', 13);
    if (!CURP_PATTERN.test(curp)) fail('La CURP no tiene un formato mexicano válido.');
    if (!RFC_PATTERN.test(rfc)) fail('El RFC no tiene un formato mexicano válido.');
    const birthDate = input.birthDate;
    return {
      firstNames: requiredText(input.firstNames, 'El nombre o nombres', 120),
      firstLastName: requiredText(input.firstLastName, 'El primer apellido', 80),
      secondLastName: requiredText(input.secondLastName, 'El segundo apellido', 80),
      curp, rfc, birthDate, age: calculateAge(birthDate),
      personalEmail: validEmail(input.personalEmail, 'El email'),
      personalPhone: validPhone(input.personalPhone, 'El teléfono personal'),
      workPhone: validPhone(input.workPhone, 'El teléfono de trabajo', false),
      street: requiredText(input.street, 'La calle', 160),
      neighborhood: requiredText(input.neighborhood, 'La colonia', 120),
      municipality: requiredText(input.municipality, 'El municipio', 120),
      state: requiredText(input.state, 'El estado', 120),
      locality: requiredText(input.locality, 'La localidad', 120),
      postalCode: validPostalCode(input.postalCode),
      additionalContactName: requiredText(input.additionalContactName, 'El nombre del contacto adicional', 160),
      additionalContactEmail: validEmail(input.additionalContactEmail, 'El email del contacto adicional'),
      additionalContactPhone: validPhone(input.additionalContactPhone, 'El teléfono del contacto adicional')
    };
  }

  async create(input, photo, userId = null) {
    const customer = this.normalize(input);
    if (!photo || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) fail('La fotografía del cliente es obligatoria y debe ser JPG, PNG o WEBP.');
    const duplicate = await this.repository.findPhase3Duplicate(customer);
    if (duplicate) return { ok: false, statusCode: 409, message: `Ya existe un cliente con ${duplicate.match}.` };
    await mkdir(this.photosDirectory, { recursive: true });
    const photoFilename = `${crypto.randomUUID()}${({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[photo.mimetype]}`;
    await writeFile(path.join(this.photosDirectory, photoFilename), photo.buffer);
    const id = await this.repository.createPhase3({ ...customer, photoFilename, userId });
    return { ok: true, id, customer };
  }

  async update(id, input, actor, photo = null) {
    const existing = await this.repository.findById(id);
    if (!existing) return { ok: false, statusCode: 404, message: 'Cliente no encontrado.' };
    if (actor.roleCode === 'CLIENT' && Number(existing.userId) !== Number(actor.id)) return { ok: false, statusCode: 403, message: 'No puedes editar otro expediente.' };
    const customer = this.normalize(input);
    const duplicate = await this.repository.findPhase3Duplicate(customer, id);
    if (duplicate) return { ok: false, statusCode: 409, message: `Ya existe un cliente con ${duplicate.match}.` };
    let photoFilename = null;
    if (photo) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) fail('La fotografía debe ser JPG, PNG o WEBP.');
      await mkdir(this.photosDirectory, { recursive: true });
      photoFilename = `${crypto.randomUUID()}${({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[photo.mimetype]}`;
      await writeFile(path.join(this.photosDirectory, photoFilename), photo.buffer);
    }
    await this.repository.updatePhase3(id, { ...customer, photoFilename });
    return { ok: true, customer };
  }
}
