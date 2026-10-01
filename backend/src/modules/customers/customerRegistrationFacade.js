import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const MAX_AGE = 130;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedPhotoTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const text = (value, name, maxLength) => {
  const normalized = value?.trim();
  if (!normalized) validationError(`${name} es obligatorio.`);
  if (normalized.length > maxLength) validationError(`${name} excede ${maxLength} caracteres.`);
  return normalized;
};

const email = (value, name, required = true) => {
  if (!value?.trim() && !required) return null;
  const normalized = text(value, name, 180).toLowerCase();
  if (!emailPattern.test(normalized)) validationError(`${name} no tiene un formato válido.`);
  return normalized;
};

const phone = (value, name, required = true) => {
  if (!value?.trim() && !required) return null;
  const raw = text(value, name, 25);
  if (!/^[+()\s.-]*\d[\d+()\s.-]*$/.test(raw)) validationError(`${name} no tiene un formato válido.`);
  const digits = raw.replace(/\D/g, '');
  const localNumber = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits;
  if (localNumber.length !== 10) validationError(`${name} debe contener 10 dígitos mexicanos.`);
  return localNumber;
};

const birthDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) validationError('La fecha de nacimiento no tiene un formato válido.');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) validationError('La fecha de nacimiento no es válida.');
  if (date > new Date()) validationError('La fecha de nacimiento no puede estar en el futuro.');
  return value;
};

const calculateAge = (value) => {
  const birth = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayThisYear = new Date(Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()));
  if (today < birthdayThisYear) age -= 1;
  return age;
};

/**
 * Coordina validación, detección de duplicados, almacenamiento de la foto y
 * persistencia. Así la ruta HTTP no contiene reglas de negocio ni SQL.
 */
export class CustomerRegistrationFacade {
  constructor(repository, photosDirectory) {
    this.repository = repository;
    this.photosDirectory = photosDirectory;
  }

  async register(input, photo) {
    const customer = this.validate(input, photo);
    const duplicate = await this.repository.findDuplicate(customer);
    if (duplicate) {
      return { ok: false, message: `Ya existe un cliente registrado con esos datos: ${duplicate.full_name}.` };
    }

    await mkdir(this.photosDirectory, { recursive: true });
    const extension = allowedPhotoTypes.get(photo.mimetype);
    const photoFilename = `${crypto.randomUUID()}${extension}`;
    const photoPath = path.join(this.photosDirectory, photoFilename);
    await writeFile(photoPath, photo.buffer);

    try {
      const passwordHash = await bcrypt.hash(customer.password, 12);
      const { password, ...customerData } = customer;
      const id = await this.repository.create({ ...customerData, passwordHash, photoFilename });
      return { ok: true, id, fullName: customer.fullName };
    } catch (error) {
      await unlink(photoPath).catch(() => {});
      if (error.code === 'ER_DUP_ENTRY') {
        return { ok: false, message: 'Ya existe un cliente con el mismo correo o teléfono personal.' };
      }
      throw error;
    }
  }

  validate(input, photo) {
    if (!photo) validationError('La fotografía del cliente es obligatoria.');
    if (!allowedPhotoTypes.has(photo.mimetype)) validationError('La fotografía debe ser JPG, PNG o WEBP.');

    const normalizedBirthDate = birthDate(input.birthDate);
    const age = Number(input.age);
    const expectedAge = calculateAge(normalizedBirthDate);
    if (!Number.isInteger(age) || age < 0 || age > MAX_AGE) validationError('La edad debe ser un número entre 0 y 130.');
    if (age !== expectedAge) validationError('La edad no coincide con la fecha de nacimiento.');

    const personalEmail = email(input.personalEmail, 'El correo personal');
    const workEmail = email(input.workEmail, 'El correo de trabajo', false);
    if (personalEmail === workEmail) validationError('El correo personal y el de trabajo deben ser distintos.');

    const personalPhone = phone(input.personalPhone, 'El teléfono personal');
    const workPhone = phone(input.workPhone, 'El teléfono de trabajo', false);
    if (personalPhone === workPhone) validationError('El teléfono personal y el de trabajo deben ser distintos.');

    const postalCode = text(input.postalCode, 'El código postal', 5);
    if (!/^\d{5}$/.test(postalCode)) validationError('El código postal debe tener exactamente 5 dígitos.');

    const password = input.password || '';
    if (password.length < 12) validationError('La contraseña debe tener al menos 12 caracteres.');
    if (Buffer.byteLength(password, 'utf8') > 72) validationError('La contraseña no puede exceder 72 bytes.');
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) validationError('La contraseña debe incluir mayúscula, minúscula y número.');
    if (password !== input.confirmPassword) validationError('La confirmación de contraseña no coincide.');

    return {
      fullName: text(input.fullName, 'El nombre completo', 160),
      alternateContact: text(input.alternateContact, 'El contacto alternativo', 160),
      age,
      birthDate: normalizedBirthDate,
      personalPhone,
      workPhone,
      personalEmail,
      workEmail,
      street: text(input.street, 'La calle', 160),
      neighborhood: text(input.neighborhood, 'La colonia', 120),
      municipality: text(input.municipality, 'El municipio', 120),
      state: text(input.state, 'El estado', 120),
      postalCode,
      password
    };
  }
}
