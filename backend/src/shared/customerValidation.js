import { normalizeEmail, normalizePhone, normalizeText } from './normalization.js';

export const CURP_PATTERN = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
export const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const requiredText = (value, label, max = 180) => {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length > max) fail(`${label} es obligatorio o excede el límite permitido.`);
  return normalized;
};

export const validEmail = (value, label, required = true) => {
  const normalized = normalizeEmail(value);
  if (!normalized && !required) return null;
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 180) fail(`${label} no tiene un formato válido.`);
  return normalized;
};

export const validPhone = (value, label, required = true) => {
  if (!String(value ?? '').trim() && !required) return null;
  const digits = normalizePhone(value);
  if (!/^\d{10}$/.test(digits)) fail(`${label} debe contener 10 dígitos mexicanos.`);
  return digits;
};

export const validPostalCode = (value) => {
  const code = String(value ?? '').trim();
  if (!/^\d{5}$/.test(code)) fail('El código postal debe tener 5 dígitos.');
  return code;
};

export const calculateAge = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) fail('La fecha de nacimiento no tiene un formato válido.');
  const birth = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  if (Number.isNaN(birth.valueOf()) || birth.toISOString().slice(0, 10) !== value || birth > today) fail('La fecha de nacimiento no es válida.');
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today < new Date(Date.UTC(today.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()))) age -= 1;
  if (age < 0 || age > 130) fail('La edad calculada no es válida.');
  return age;
};

export const validPassword = (password, confirmation) => {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) fail('La contraseña debe tener entre 12 y 72 bytes.');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) fail('La contraseña debe incluir mayúscula, minúscula y número.');
  if (confirmation !== undefined && password !== confirmation) fail('La confirmación de contraseña no coincide.');
  return password;
};
