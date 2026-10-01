/**
 * Encapsula las consultas de persistencia del módulo de clientes. El Facade
 * concentra las reglas de negocio; este objeto solo conoce MySQL.
 */
export class CustomerRepository {
  constructor(db) {
    this.db = db;
  }

  async findDuplicate({ personalEmail, workEmail, personalPhone }) {
    const [rows] = await this.db.execute(
      `SELECT id, full_name
       FROM customers
       WHERE personal_email IN (?, ?)
          OR work_email IN (?, ?)
          OR personal_phone = ?
       LIMIT 1`,
      [personalEmail, workEmail, personalEmail, workEmail, personalPhone]
    );
    return rows[0] || null;
  }

  async create(customer) {
    const [result] = await this.db.execute(
      `INSERT INTO customers (
        full_name, alternate_contact, age, birth_date, personal_phone, work_phone,
        personal_email, work_email, street, neighborhood, municipality, state,
        postal_code, password_hash, photo_filename
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.fullName, customer.alternateContact, customer.age, customer.birthDate,
        customer.personalPhone, customer.workPhone, customer.personalEmail,
        customer.workEmail, customer.street, customer.neighborhood, customer.municipality,
        customer.state, customer.postalCode, customer.passwordHash, customer.photoFilename
      ]
    );
    return result.insertId;
  }

  async list() {
    const [rows] = await this.db.query(
      `SELECT id, full_name fullName, alternate_contact alternateContact, age,
        birth_date birthDate, personal_phone personalPhone, work_phone workPhone,
        personal_email personalEmail, work_email workEmail, street, neighborhood,
        municipality, state, postal_code postalCode, created_at createdAt
       FROM customers
       ORDER BY full_name`
    );
    return rows;
  }

  async findPhotoById(id) {
    const [rows] = await this.db.execute(
      'SELECT photo_filename FROM customers WHERE id = ?',
      [id]
    );
    return rows[0]?.photo_filename || null;
  }
}
