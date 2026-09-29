-- Migración para instalaciones que ya ejecutaron database/schema.sql antes
-- de la fase de Registro de Clientes.
START TRANSACTION;

UPDATE roles SET code = 'SYSTEM_ADMIN', name = 'Administrador del Sistema',
  description = 'Administración del sistema y registro de clientes.'
WHERE code = 'BOSS' AND NOT EXISTS (SELECT 1 FROM (SELECT * FROM roles) AS existing_admin WHERE existing_admin.code = 'SYSTEM_ADMIN');

INSERT IGNORE INTO roles (code, name, description) VALUES
  ('SYSTEM_ADMIN', 'Administrador del Sistema', 'Administración del sistema y registro de clientes.'),
  ('RECEPTIONIST', 'Recepcionista', 'Registro y consulta de clientes.');
INSERT IGNORE INTO permissions (code, description) VALUES
  ('customers.register', 'Registrar y consultar clientes');
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'customers.register'
WHERE r.code IN ('SYSTEM_ADMIN', 'RECEPTIONIST');

CREATE TABLE IF NOT EXISTS workshops (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  alternate_contact VARCHAR(160) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  birth_date DATE NOT NULL,
  personal_phone CHAR(10) NOT NULL UNIQUE,
  work_phone CHAR(10) NULL,
  personal_email VARCHAR(180) NOT NULL UNIQUE,
  work_email VARCHAR(180) NULL UNIQUE,
  street VARCHAR(160) NOT NULL,
  neighborhood VARCHAR(120) NOT NULL,
  municipality VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  postal_code CHAR(5) NOT NULL,
  photo_filename VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_workshops (
  customer_id BIGINT UNSIGNED NOT NULL,
  workshop_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, workshop_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT
);

COMMIT;
