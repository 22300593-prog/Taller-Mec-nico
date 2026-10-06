/**
 * Encapsula las consultas de persistencia del módulo de clientes. El Facade
 * concentra las reglas de negocio; este objeto solo conoce MySQL.
 */
export class CustomerRepository {
  constructor(db) {
    this.db = db;
  }

  async findDuplicate({ personalEmail, workEmail, personalPhone }, excludedId = null) {
    const [rows] = await this.db.execute(
      `SELECT id, full_name
       FROM customers
       WHERE (personal_email IN (?, ?)
          OR work_email IN (?, ?)
          OR personal_phone = ?)
         AND (? IS NULL OR id <> ?)
       LIMIT 1`,
      [personalEmail, workEmail, personalEmail, workEmail, personalPhone, excludedId, excludedId]
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
      `SELECT id, user_id userId, full_name fullName, alternate_contact alternateContact, age,
        birth_date birthDate, personal_phone personalPhone, work_phone workPhone,
        personal_email personalEmail, work_email workEmail, street, neighborhood,
        municipality, state, postal_code postalCode, created_at createdAt
       FROM customers
       ORDER BY full_name`
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await this.db.execute(
      `SELECT id, user_id userId, full_name fullName, first_names firstNames, first_last_name firstLastName, second_last_name secondLastName, curp, rfc, additional_contact_name additionalContactName, additional_contact_email additionalContactEmail, additional_contact_phone additionalContactPhone, locality, status, alternate_contact alternateContact, age,
        birth_date birthDate, personal_phone personalPhone, work_phone workPhone,
        personal_email personalEmail, work_email workEmail, street, neighborhood,
        municipality, state, postal_code postalCode, photo_filename photoFilename
       FROM customers
       WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async update(id, customer) {
    const values = [
      customer.fullName, customer.alternateContact, customer.age, customer.birthDate,
      customer.personalPhone, customer.workPhone, customer.personalEmail,
      customer.workEmail, customer.street, customer.neighborhood, customer.municipality,
      customer.state, customer.postalCode
    ];
    const photoUpdate = customer.photoFilename ? ', photo_filename = ?' : '';
    if (customer.photoFilename) values.push(customer.photoFilename);
    values.push(id);

    const [result] = await this.db.execute(
      `UPDATE customers
       SET full_name = ?, alternate_contact = ?, age = ?, birth_date = ?,
           personal_phone = ?, work_phone = ?, personal_email = ?, work_email = ?,
           street = ?, neighborhood = ?, municipality = ?, state = ?, postal_code = ?${photoUpdate}
       WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  async findPhotoById(id) {
    const [rows] = await this.db.execute(
      'SELECT photo_filename FROM customers WHERE id = ?',
      [id]
    );
    return rows[0]?.photo_filename || null;
  }

  async findPhase3Duplicate(customer, excludedId = null) {
    const [rows] = await this.db.execute(
      `SELECT id,
        CASE WHEN curp = ? THEN 'esa CURP' WHEN rfc = ? THEN 'ese RFC'
          WHEN LOWER(personal_email) = LOWER(?) THEN 'ese email' ELSE 'ese teléfono' END match
       FROM customers
       WHERE (curp = ? OR rfc = ? OR LOWER(personal_email) = LOWER(?) OR personal_phone = ?)
         AND (? IS NULL OR id <> ?) LIMIT 1`,
      [customer.curp, customer.rfc, customer.personalEmail, customer.curp, customer.rfc, customer.personalEmail, customer.personalPhone, excludedId, excludedId]
    );
    return rows[0] || null;
  }

  async createPhase3(customer) {
    const fullName = `${customer.firstNames} ${customer.firstLastName} ${customer.secondLastName}`;
    const [result] = await this.db.execute(
      `INSERT INTO customers(user_id,full_name,first_names,first_last_name,second_last_name,curp,rfc,alternate_contact,additional_contact_name,additional_contact_email,additional_contact_phone,age,birth_date,personal_phone,work_phone,personal_email,street,neighborhood,municipality,locality,state,postal_code,photo_filename,status)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'ACTIVE')`,
      [customer.userId,fullName,customer.firstNames,customer.firstLastName,customer.secondLastName,customer.curp,customer.rfc,customer.additionalContactName,customer.additionalContactName,customer.additionalContactEmail,customer.additionalContactPhone,customer.age,customer.birthDate,customer.personalPhone,customer.workPhone,customer.personalEmail,customer.street,customer.neighborhood,customer.municipality,customer.locality,customer.state,customer.postalCode,customer.photoFilename]
    );
    return result.insertId;
  }

  async updatePhase3(id, customer) {
    const fullName = `${customer.firstNames} ${customer.firstLastName} ${customer.secondLastName}`;
    const photoUpdate = customer.photoFilename ? ',photo_filename=?' : '';
    const values = [fullName,customer.firstNames,customer.firstLastName,customer.secondLastName,customer.curp,customer.rfc,customer.additionalContactName,customer.additionalContactName,customer.additionalContactEmail,customer.additionalContactPhone,customer.age,customer.birthDate,customer.personalPhone,customer.workPhone,customer.personalEmail,customer.street,customer.neighborhood,customer.municipality,customer.locality,customer.state,customer.postalCode];
    if (customer.photoFilename) values.push(customer.photoFilename);
    values.push(id);
    await this.db.execute(
      `UPDATE customers SET full_name=?,first_names=?,first_last_name=?,second_last_name=?,curp=?,rfc=?,alternate_contact=?,additional_contact_name=?,additional_contact_email=?,additional_contact_phone=?,age=?,birth_date=?,personal_phone=?,work_phone=?,personal_email=?,street=?,neighborhood=?,municipality=?,locality=?,state=?,postal_code=?${photoUpdate} WHERE id=?`,
      values
    );
  }

  async page({ page, limit, search, status, workshopId, user }) {
    const params = []; const clauses = ['1=1'];
    if (search) { clauses.push('(c.full_name LIKE ? OR c.curp LIKE ? OR c.rfc LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { clauses.push('c.status=?'); params.push(status); }
    if (workshopId) { clauses.push('EXISTS(SELECT 1 FROM customer_workshops fcw WHERE fcw.customer_id=c.id AND fcw.workshop_id=?)'); params.push(workshopId); }
    if (user.roleCode === 'CLIENT') { clauses.push('c.user_id=?'); params.push(user.id); }
    if (['SECRETARY', 'RECEPTIONIST'].includes(user.roleCode)) { clauses.push('EXISTS(SELECT 1 FROM customer_workshops scw JOIN user_workshops suw ON suw.workshop_id=scw.workshop_id WHERE scw.customer_id=c.id AND suw.user_id=?)'); params.push(user.id); }
    const where = clauses.join(' AND ');
    const [countRows] = await this.db.execute(`SELECT COUNT(*) total FROM customers c WHERE ${where}`, params);
    const [items] = await this.db.execute(`SELECT c.id,c.full_name fullName,c.first_names firstNames,c.first_last_name firstLastName,c.second_last_name secondLastName,c.curp,c.rfc,c.birth_date birthDate,c.age,c.personal_email personalEmail,c.personal_phone personalPhone,c.status,c.postal_code postalCode,c.state,c.municipality,c.neighborhood,c.locality,GROUP_CONCAT(DISTINCT w.name ORDER BY w.name SEPARATOR ', ') workshops,GROUP_CONCAT(DISTINCT w.id ORDER BY w.name SEPARATOR ',') workshopIds FROM customers c LEFT JOIN customer_workshops cw ON cw.customer_id=c.id LEFT JOIN workshops w ON w.id=cw.workshop_id WHERE ${where} GROUP BY c.id ORDER BY c.full_name ${user.sort === 'desc' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { items, pagination: { page, limit, total: countRows[0].total, pages: Math.ceil(countRows[0].total / limit) } };
  }

  async setStatus(id, status) { const [result] = await this.db.execute('UPDATE customers SET status=? WHERE id=?', [status, id]); return result.affectedRows > 0; }
  async findByUserId(userId) { const [rows] = await this.db.execute(`SELECT id,user_id userId,full_name fullName,first_names firstNames,first_last_name firstLastName,second_last_name secondLastName,curp,rfc,birth_date birthDate,age,personal_email personalEmail,personal_phone personalPhone,work_phone workPhone,street,neighborhood,municipality,locality,state,postal_code postalCode,additional_contact_name additionalContactName,additional_contact_email additionalContactEmail,additional_contact_phone additionalContactPhone,status,photo_filename photoFilename FROM customers WHERE user_id=?`, [userId]); return rows[0] || null; }
  async workshopIds(id) { const [rows] = await this.db.execute('SELECT workshop_id workshopId FROM customer_workshops WHERE customer_id=?', [id]); return rows.map((row) => row.workshopId); }
  async replaceWorkshop(id, workshopId) { await this.db.execute('DELETE FROM customer_workshops WHERE customer_id=?', [id]); await this.db.execute('INSERT INTO customer_workshops(customer_id,workshop_id) VALUES(?,?)', [id,workshopId]); }
}
