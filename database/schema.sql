SET NAMES utf8mb4;

CREATE TABLE roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL
);

CREATE TABLE permissions (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL
);

CREATE TABLE role_permissions (
  role_id TINYINT UNSIGNED NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE password_reset_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','USED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  authorized_by BIGINT UNSIGNED NULL,
  authorized_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (authorized_by) REFERENCES users(id)
);

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  justification VARCHAR(500) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

INSERT INTO roles (code, name, description) VALUES
('SYSTEM_ADMIN', 'Administrador del Sistema', 'Administración del sistema y registro de clientes.'),
('RECEPTIONIST', 'Recepcionista', 'Registro y consulta de clientes.'),
('MECHANIC', 'Mecánico', 'Checklist, estatus y solicitud de refacciones.'),
('CLIENT', 'Cliente', 'Consulta sus vehículos y órdenes.');

INSERT INTO permissions (code, description) VALUES
('users.manage', 'Crear, editar, desactivar y asignar roles'),
('audit.view', 'Consultar la bitácora de seguridad'),
('password_reset.authorize', 'Autorizar recuperación de empleados'),
('orders.edit', 'Editar registros de órdenes'),
('checklists.fill', 'Completar listas de revisión'),
('orders.status.change', 'Cambiar estado de una orden'),
('parts.request', 'Solicitar refacciones'),
('orders.view_own', 'Consultar órdenes propias'),
('customers.register', 'Registrar y consultar clientes');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'SYSTEM_ADMIN';
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'customers.register' WHERE r.code = 'RECEPTIONIST';
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('checklists.fill','orders.status.change','parts.request') WHERE r.code = 'MECHANIC';
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'orders.view_own' WHERE r.code = 'CLIENT';

CREATE TABLE workshops (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE customers (
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
  password_hash VARCHAR(255) NOT NULL,
  photo_filename VARCHAR(80) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_customer_age CHECK (age <= 130)
);

-- Un cliente puede asociarse con varios talleres sin cambiar su registro base.
CREATE TABLE customer_workshops (
  customer_id BIGINT UNSIGNED NOT NULL,
  workshop_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, workshop_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT
);
