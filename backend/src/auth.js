import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from './db.js';

const secret = () => process.env.JWT_SECRET || 'solo-desarrollo-cambiar-en-produccion';
export const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.roleCode }, secret(), { expiresIn: '8h' });

export async function authenticate(req, res, next) {
  const raw = req.headers.authorization?.replace('Bearer ', '');
  if (!raw) return res.status(401).json({ message: 'Se requiere autenticación.' });
  try {
    const payload = jwt.verify(raw, secret());
    const [rows] = await db.execute(`SELECT u.id, u.full_name, u.email, u.active, r.code roleCode, r.name roleName,
      GROUP_CONCAT(p.code) permissions FROM users u JOIN roles r ON r.id=u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id
      WHERE u.id=? GROUP BY u.id,u.full_name,u.email,u.active,r.code,r.name`, [payload.sub]);
    if (!rows[0]?.active) return res.status(401).json({ message: 'Usuario inactivo.' });
    req.user = { ...rows[0], permissions: rows[0].permissions?.split(',').filter(Boolean) || [] };
    next();
  } catch { return res.status(401).json({ message: 'Sesión no válida o vencida.' }); }
}

export const allow = (...permissions) => (req, res, next) =>
  permissions.every(p => req.user.permissions.includes(p)) ? next() : res.status(403).json({ message: 'No tienes permiso para esta acción.' });

export const audit = async (actorId, action, entityType, entityId, justification, before = null, after = null) => {
  await db.execute('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,justification,before_data,after_data) VALUES (?,?,?,?,?,?,?)',
    [actorId, action, entityType, entityId, justification, before && JSON.stringify(before), after && JSON.stringify(after)]);
};

export const hashResetToken = token => crypto.createHash('sha256').update(token).digest('hex');
