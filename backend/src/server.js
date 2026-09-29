import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import 'dotenv/config';
import { db } from './db.js';
import { authenticate, allow, allowRoles, audit, hashResetToken, tokenFor } from './auth.js';
import { CustomerRepository } from './modules/customers/customerRepository.js';
import { CustomerRegistrationFacade } from './modules/customers/customerRegistrationFacade.js';

const app = express();
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(helmet()); app.use(cors({ origin: allowedOrigins })); app.use(express.json());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));

const customerRoles = ['SYSTEM_ADMIN', 'RECEPTIONIST'];
const customerRepository = new CustomerRepository(db);
const customerFacade = new CustomerRegistrationFacade(customerRepository, path.resolve('uploads/customers'));
const customerPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});
const uploadCustomerPhoto = (req, res, next) => customerPhotoUpload.single('photo')(req, res, (error) => {
  if (!error) return next();
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'La fotografía no debe pesar más de 15 MB.' });
  return res.status(400).json({ message: 'No se pudo procesar la fotografía.' });
});

async function currentUser(id) {
  const [rows] = await db.execute(`SELECT u.id,u.full_name,u.email,u.active,r.code roleCode,r.name roleName,GROUP_CONCAT(p.code) permissions
    FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? GROUP BY u.id,u.full_name,u.email,u.active,r.code,r.name`, [id]);
  const u = rows[0]; return u && { ...u, permissions: u.permissions?.split(',').filter(Boolean) || [] };
}
async function ensureSystemAdministrator() {
  const [found] = await db.execute(`SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='SYSTEM_ADMIN' LIMIT 1`);
  if (!found.length) {
    const hash = await bcrypt.hash(process.env.INITIAL_BOSS_PASSWORD || 'CambiaEstaClave2026!', 12);
    await db.execute(`INSERT INTO users(full_name,email,password_hash,role_id) SELECT ?,?, ?,id FROM roles WHERE code='SYSTEM_ADMIN'`,
      ['Administrador del Sistema', process.env.INITIAL_SYSTEM_ADMIN_EMAIL || process.env.INITIAL_BOSS_EMAIL || 'jefe@talleroro.local', hash]);
    console.log('Cuenta inicial de Administrador del Sistema creada. Cambia su contraseña tras el primer acceso.');
  }
}

app.get('/api/health', async (_req,res) => { try { await db.query('SELECT 1'); res.json({ status: 'ok' }); } catch { res.status(503).json({ status: 'database-unavailable' }); } });
app.post('/api/auth/login', async (req,res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  const [rows] = await db.execute(`SELECT u.*, r.code roleCode FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=?`, [email.toLowerCase().trim()]);
  const user = rows[0];
  if (!user?.active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
  await db.execute('UPDATE users SET last_login_at=NOW() WHERE id=?', [user.id]);
  await audit(user.id, 'AUTH_LOGIN', 'USER', String(user.id), 'Inicio de sesión correcto');
  res.json({ token: tokenFor(user), user: await currentUser(user.id) });
});
app.get('/api/auth/me', authenticate, (req,res) => res.json({ user: req.user }));

app.post('/api/auth/password-reset/request', async (req,res) => {
  const { email } = req.body; const [users] = await db.execute('SELECT id,role_id FROM users WHERE email=? AND active=1', [email?.toLowerCase().trim()]);
  const user = users[0];
  if (!user) return res.json({ message: 'Si el correo existe, se registró la solicitud.' });
  const rawToken = crypto.randomBytes(32).toString('hex');
  await db.execute(`INSERT INTO password_reset_requests(user_id,requested_by,token_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(), INTERVAL 30 MINUTE))`, [user.id,user.id,hashResetToken(rawToken)]);
  // En producción, envíe rawToken por correo. Nunca se guarda ni se devuelve para empleados.
  res.json({ message: 'Solicitud enviada al Jefe para autorización.' });
});
app.get('/api/password-resets', authenticate, allow('password_reset.authorize'), async (_req,res) => {
  const [rows] = await db.query(`SELECT pr.id, u.full_name, u.email, pr.created_at FROM password_reset_requests pr JOIN users u ON u.id=pr.user_id WHERE pr.status='PENDING' ORDER BY pr.created_at DESC`); res.json(rows);
});
app.post('/api/password-resets/:id/authorize', authenticate, allow('password_reset.authorize'), async (req,res) => {
  const justification = req.body.justification?.trim(); if (!justification) return res.status(400).json({ message: 'La justificación firmada es obligatoria.' });
  const [result] = await db.execute(`UPDATE password_reset_requests SET status='APPROVED',authorized_by=?,authorized_at=NOW() WHERE id=? AND status='PENDING'`, [req.user.id,req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Solicitud no disponible.' });
  await audit(req.user.id, 'AUTHORIZE_PASSWORD_RESET', 'PASSWORD_RESET', req.params.id, justification); res.json({ message: 'Recuperación autorizada y registrada en bitácora.' });
});
app.post('/api/auth/password-reset/complete', async (req,res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 12) return res.status(400).json({ message: 'Token y una contraseña de al menos 12 caracteres son obligatorios.' });
  const [requests] = await db.execute(`SELECT * FROM password_reset_requests WHERE token_hash=? AND status='APPROVED' AND expires_at > NOW()`, [hashResetToken(token)]);
  const request = requests[0];
  if (!request) return res.status(400).json({ message: 'El enlace no es válido, no fue autorizado o expiró.' });
  const hash = await bcrypt.hash(password, 12);
  await db.execute('UPDATE users SET password_hash=? WHERE id=?', [hash, request.user_id]);
  await db.execute(`UPDATE password_reset_requests SET status='USED' WHERE id=?`, [request.id]);
  await audit(request.user_id, 'PASSWORD_RESET_COMPLETED', 'USER', String(request.user_id), 'Recuperación autorizada por el Jefe');
  res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

app.get('/api/users', authenticate, allow('users.manage'), async (_req,res) => { const [rows] = await db.query(`SELECT u.id,u.full_name,u.email,u.active,u.created_at,r.code roleCode,r.name roleName FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.full_name`); res.json(rows); });
app.post('/api/users', authenticate, allow('users.manage'), async (req,res) => {
  const { fullName,email,password,roleCode,justification } = req.body; if (!fullName||!email||!password||!roleCode||!justification) return res.status(400).json({ message: 'Todos los campos y la justificación son obligatorios.' });
  const hash = await bcrypt.hash(password,12);
  try { const [result] = await db.execute(`INSERT INTO users(full_name,email,password_hash,role_id) SELECT ?,?,?,id FROM roles WHERE code=?`,[fullName,email.toLowerCase(),hash,roleCode]);
    if (!result.affectedRows) return res.status(400).json({ message:'Rol inválido.' }); await audit(req.user.id,'CREATE_USER','USER',String(result.insertId),justification); res.status(201).json({ id:result.insertId });
  } catch { res.status(409).json({ message:'El correo ya está registrado.' }); }
});
app.get('/api/audit', authenticate, allow('audit.view'), async (_req,res) => { const [rows] = await db.query(`SELECT a.*,u.full_name actor FROM audit_log a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100`); res.json(rows); });

// Vista -> Facade -> Repository: la ruta solo traduce HTTP y delega el registro.
app.get('/api/customers', authenticate, allowRoles(...customerRoles), async (_req, res, next) => {
  try {
    res.json(await customerRepository.list());
  } catch (error) {
    next(error);
  }
});
app.post('/api/customers', authenticate, allowRoles(...customerRoles), uploadCustomerPhoto, async (req, res, next) => {
  try {
    const result = await customerFacade.register(req.body, req.file);
    if (!result.ok) return res.status(409).json({ message: result.message });
    await audit(req.user.id, 'CREATE_CUSTOMER', 'CUSTOMER', String(result.id), 'Registro de cliente exitoso', null, { id: result.id, fullName: result.fullName });
    return res.status(201).json({ message: 'Cliente registrado exitosamente.', customer: { id: result.id, fullName: result.fullName } });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
  }
});
app.get('/api/customers/:id/photo', authenticate, allowRoles(...customerRoles), async (req, res, next) => {
  try {
    const filename = await customerRepository.findPhotoById(req.params.id);
    if (!filename) return res.status(404).json({ message: 'Fotografía no encontrada.' });
    return res.sendFile(path.resolve('uploads/customers', filename));
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Ocurrió un error interno.' });
});

const port = Number(process.env.PORT || 4000);
db.getConnection().then(async c => { c.release(); await ensureSystemAdministrator(); app.listen(port, () => console.log(`API lista en http://localhost:${port}`)); }).catch(err => { console.error('No se pudo conectar a MySQL:', err.message); process.exit(1); });
