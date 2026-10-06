/**
 * Normalización común para datos de negocio. Contraseñas, tokens, hashes,
 * URL y nombres de archivo nunca deben pasar por estas funciones.
 */
export const normalizeText = (value) => String(value ?? '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleUpperCase('es-MX');

// El correo conserva las mayúsculas/minúsculas capturadas; solo se quitan espacios externos.
export const normalizeEmail = (value) => String(value ?? '').trim();

export const normalizePhone = (value) => String(value ?? '')
  .replace(/\D/g, '')
  .replace(/^52(?=\d{10}$)/, '');
