import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const curpPattern = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const fail = (message, statusCode = 400) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
const clean = (value, label, max = 180) => {
  const normalized = value?.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-MX');
  if (!normalized || normalized.length > max) fail(`${label} es obligatorio o excede el límite permitido.`);
  return normalized;
};
const email = (value, label) => { const normalized = value?.trim().toLowerCase(); if (!emailPattern.test(normalized || '')) fail(`${label} no tiene un formato válido.`); return normalized; };
const phone = (value, label, required = true) => {
  if (!value?.trim() && !required) return null;
  const digits = value.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
  if (!/^\d{10}$/.test(digits)) fail(`${label} debe contener 10 dígitos mexicanos.`);
  return digits;
};
const ageFrom = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) fail('La fecha de nacimiento no tiene un formato válido.');
  const birth = new Date(`${value}T00:00:00Z`); const today = new Date();
  if (Number.isNaN(birth.valueOf()) || birth > today) fail('La fecha de nacimiento no es válida.');
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today < new Date(Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()))) age -= 1;
  if (age < 0 || age > 130) fail('La edad calculada no es válida.');
  return age;
};

/** Reglas de negocio de la Fase 3; los datos normalizados no dependen de la vista. */
export class CustomerAdministrationFacade {
  constructor(repository, photosDirectory) { this.repository = repository; this.photosDirectory = photosDirectory; }

  normalize(input) {
    const curp = clean(input.curp, 'La CURP', 18);
    const rfc = clean(input.rfc, 'El RFC', 13);
    if (!curpPattern.test(curp)) fail('La CURP no tiene un formato mexicano válido.');
    if (!rfcPattern.test(rfc)) fail('El RFC no tiene un formato mexicano válido.');
    const birthDate = input.birthDate;
    return {
      firstNames: clean(input.firstNames, 'El nombre o nombres', 120),
      firstLastName: clean(input.firstLastName, 'El primer apellido', 80),
      secondLastName: clean(input.secondLastName, 'El segundo apellido', 80),
      curp, rfc, birthDate, age: ageFrom(birthDate),
      personalEmail: email(input.personalEmail, 'El email'),
      personalPhone: phone(input.personalPhone, 'El teléfono personal'),
      workPhone: phone(input.workPhone, 'El teléfono de trabajo', false),
      street: clean(input.street, 'La calle', 160),
      neighborhood: clean(input.neighborhood, 'La colonia', 120),
      municipality: clean(input.municipality, 'El municipio', 120),
      state: clean(input.state, 'El estado', 120),
      locality: clean(input.locality, 'La localidad', 120),
      postalCode: (() => { if (!/^\d{5}$/.test(input.postalCode || '')) fail('El código postal debe tener 5 dígitos.'); return input.postalCode; })(),
      additionalContactName: clean(input.additionalContactName, 'El nombre del contacto adicional', 160),
      additionalContactEmail: email(input.additionalContactEmail, 'El email del contacto adicional'),
      additionalContactPhone: phone(input.additionalContactPhone, 'El teléfono del contacto adicional')
    };
  }

  async create(input, photo, userId = null) {
    const customer = this.normalize(input);
    if (!photo || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimetype)) fail('La fotografía del cliente es obligatoria y debe ser JPG, PNG o WEBP.');
    const duplicate = await this.repository.findPhase3Duplicate(customer);
    if (duplicate) return { ok: false, statusCode: 409, message: `Ya existe un cliente con ${duplicate.match}.` };
    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;
    await mkdir(this.photosDirectory, { recursive: true });
    const photoFilename = `${crypto.randomUUID()}${({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[photo.mimetype]}`;
    await writeFile(path.join(this.photosDirectory, photoFilename), photo.buffer);
    const id = await this.repository.createPhase3({ ...customer, passwordHash, photoFilename, userId });
    return { ok: true, id, customer };
  }

  async update(id, input, actor) {
    const existing = await this.repository.findById(id);
    if (!existing) return { ok: false, statusCode: 404, message: 'Cliente no encontrado.' };
    if (actor.roleCode === 'CLIENT' && Number(existing.userId) !== Number(actor.id)) return { ok: false, statusCode: 403, message: 'No puedes editar otro expediente.' };
    const customer = this.normalize(input);
    const duplicate = await this.repository.findPhase3Duplicate(customer, id);
    if (duplicate) return { ok: false, statusCode: 409, message: `Ya existe un cliente con ${duplicate.match}.` };
    await this.repository.updatePhase3(id, customer);
    return { ok: true, customer };
  }
}
