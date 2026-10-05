-- Fase 3: extensiones incrementales; conserva los expedientes y talleres existentes.
START TRANSACTION;

INSERT IGNORE INTO roles (code, name, description) VALUES
  ('SECRETARY', 'Secretaria', 'Registro, consulta y atención de clientes por taller.');
INSERT IGNORE INTO permissions (code, description) VALUES
  ('customers.manage', 'Administrar clientes, asociaciones y estatus'),
  ('workshops.manage', 'Administrar talleres'),
  ('customers.self_manage', 'Completar el propio expediente de cliente');
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('customers.register', 'customers.manage', 'workshops.manage', 'customers.self_manage')
WHERE r.code = 'SYSTEM_ADMIN';
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'customers.register'
WHERE r.code IN ('RECEPTIONIST', 'SECRETARY');
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'customers.self_manage'
WHERE r.code = 'CLIENT';

ALTER TABLE customers
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN first_names VARCHAR(120) NULL AFTER full_name,
  ADD COLUMN first_last_name VARCHAR(80) NULL AFTER first_names,
  ADD COLUMN second_last_name VARCHAR(80) NULL AFTER first_last_name,
  ADD COLUMN curp CHAR(18) NULL AFTER second_last_name,
  ADD COLUMN rfc CHAR(13) NULL AFTER curp,
  ADD COLUMN locality VARCHAR(120) NULL AFTER municipality,
  ADD COLUMN additional_contact_name VARCHAR(160) NULL AFTER alternate_contact,
  ADD COLUMN additional_contact_email VARCHAR(180) NULL AFTER additional_contact_name,
  ADD COLUMN additional_contact_phone CHAR(10) NULL AFTER additional_contact_email,
  ADD COLUMN status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER photo_filename,
  ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
  ADD UNIQUE KEY uq_customers_curp (curp),
  ADD UNIQUE KEY uq_customers_rfc (rfc),
  ADD UNIQUE KEY uq_customers_user (user_id),
  ADD CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE workshops
  ADD COLUMN street VARCHAR(160) NULL AFTER name,
  ADD COLUMN neighborhood VARCHAR(120) NULL AFTER street,
  ADD COLUMN postal_code CHAR(5) NULL AFTER neighborhood,
  ADD COLUMN state VARCHAR(120) NULL AFTER postal_code,
  ADD COLUMN municipality VARCHAR(120) NULL AFTER state,
  ADD COLUMN locality VARCHAR(120) NULL AFTER municipality,
  ADD COLUMN legal_name VARCHAR(180) NULL AFTER locality,
  ADD COLUMN phone CHAR(10) NULL AFTER legal_name,
  ADD COLUMN rfc CHAR(13) NULL AFTER phone,
  ADD COLUMN contact_email VARCHAR(180) NULL AFTER rfc,
  ADD COLUMN photo_filename VARCHAR(80) NULL AFTER contact_email,
  ADD COLUMN status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER active,
  ADD UNIQUE KEY uq_workshops_rfc (rfc);

CREATE TABLE user_workshops (
  user_id BIGINT UNSIGNED NOT NULL,
  workshop_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, workshop_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE actividades_clientes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  cliente_id BIGINT UNSIGNED NULL,
  taller_id BIGINT UNSIGNED NULL,
  accion VARCHAR(60) NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES users(id),
  FOREIGN KEY (cliente_id) REFERENCES customers(id),
  FOREIGN KEY (taller_id) REFERENCES workshops(id),
  INDEX idx_actividades_cliente_fecha (cliente_id, fecha_hora),
  INDEX idx_actividades_taller_fecha (taller_id, fecha_hora)
);

COMMIT;
