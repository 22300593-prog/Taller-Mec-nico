# Taller Oro · Fases 1 y 2

Sistema de acceso y registro de clientes para un taller mecánico: autenticación con contraseñas hasheadas (bcrypt), JWT, roles, permisos, recuperación de contraseña autorizada y bitácora de seguridad.

## Documentación del Registro de Clientes

- [Diagrama de componentes en español](docs/diagrama-componentes-clientes.md)
- [Fases realizadas](docs/fases-registro-clientes.md)
- [Documentación técnica y endpoints](docs/registro-clientes.md)
- [Migración para una instalación existente](database/migrations/20260928_customer_registration.sql)

## Roles incluidos

| Rol | Alcance |
|---|---|
| Administrador del Sistema | Gestión de usuarios, bitácora, autorizaciones y registro de clientes. |
| Recepcionista | Registro y consulta de clientes. |
| Mecánico | Checklists, cambio de estatus y solicitudes de refacciones. No edita órdenes. |
| Cliente | Consulta sus propias órdenes. |

Las acciones administrativas reciben una justificación y se registran con el usuario responsable en `audit_log`.

## Arranque local

1. Copia `.env.example` a `.env` y cambia `JWT_SECRET` y la clave inicial.
2. Ejecuta `npm run install:all`.
3. Ejecuta `npm run db:up` para iniciar MySQL en Docker.
4. Ejecuta `npm run dev` para API (`http://localhost:4000`) y web (`http://localhost:5173`).

La cuenta inicial de Administrador del Sistema usa el correo definido por `INITIAL_SYSTEM_ADMIN_EMAIL` y la contraseña definida por `INITIAL_BOSS_PASSWORD`. Cámbiala después del primer acceso.

> Para producción: usa secretos reales, TLS, un proveedor de correo para entregar el token de recuperación y almacena las variables fuera del repositorio.
