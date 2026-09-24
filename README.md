# Taller Oro · Fase 1

Sistema de acceso para un taller mecánico: autenticación con contraseñas hasheadas (bcrypt), JWT, roles, permisos, recuperación de contraseña autorizada por el Jefe y bitácora de seguridad.

## Roles incluidos

| Rol | Alcance |
|---|---|
| Jefe único | Gestión de usuarios, todas las acciones, bitácora y autorización de recuperaciones. |
| Mecánico | Checklists, cambio de estatus y solicitudes de refacciones. No edita órdenes. |
| Cliente | Consulta sus propias órdenes. |

Las acciones administrativas reciben una justificación y se registran con el usuario responsable en `audit_log`.

## Arranque local

1. Copia `.env.example` a `.env` y cambia `JWT_SECRET` y la clave inicial.
2. Ejecuta `npm run install:all`.
3. Ejecuta `npm run db:up` para iniciar MySQL en Docker.
4. Ejecuta `npm run dev` para API (`http://localhost:4000`) y web (`http://localhost:5173`).

La cuenta de prueba inicial es `jefe@talleroro.local`, con la contraseña definida por `INITIAL_BOSS_PASSWORD`. Cámbiala después del primer acceso.

> Para producción: usa secretos reales, TLS, un proveedor de correo para entregar el token de recuperación y almacena las variables fuera del repositorio.
