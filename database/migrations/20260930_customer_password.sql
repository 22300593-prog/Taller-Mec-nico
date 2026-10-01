-- Agrega la contraseña cifrada al expediente de clientes existentes.
-- Las contraseñas de clientes nuevos se guardan exclusivamente como bcrypt.
ALTER TABLE customers
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER postal_code;
