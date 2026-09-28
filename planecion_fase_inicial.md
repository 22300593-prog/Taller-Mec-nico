# Planeación de la Fase Inicial

## 1. Objetivo y alcance real

La Fase 1 entrega la base técnica de **Taller Oro** para controlar el acceso al sistema. El alcance implementado se concentra en autenticación, autorización por roles, recuperación de contraseñas con autorización y registro de acciones sensibles. También incluye una interfaz de tablero que representa la operación del taller.

No se implementó la operación completa de órdenes de trabajo, vehículos, checklists ni refacciones. En esta fase esos elementos existen como permisos, navegación, indicadores o contenido de demostración.

## 2. Trabajo desarrollado por fase

| Fase / subfase | Elementos desarrollados | Resultado |
| --- | --- | --- |
| 1.1 Base del proyecto | Repositorio monolítico con `frontend/`, `backend/`, `database/` y configuración Docker para MySQL. | Terminada. |
| 1.2 Datos y seguridad | Esquema MySQL, usuarios, roles, permisos, bitácora y solicitudes de recuperación. | Terminada. |
| 1.3 API | API Express con autenticación JWT, hash de contraseñas, autorización por permiso, limitación de intentos y cabeceras de seguridad. | Terminada para el alcance de seguridad. |
| 1.4 Interfaz web | Inicio de sesión, persistencia del token, cierre de sesión, navegación lateral condicionada por permisos y tablero visual. | Terminada para el alcance de interfaz inicial. |
| 1.5 Operación del taller | Órdenes, vehículos, checklists y refacciones. | Pendiente: no tienen tablas ni API funcional en esta fase. |

## 3. Módulos y estado

| Módulo | Archivos principales | Estado | Descripción objetiva |
| --- | --- | --- | --- |
| Configuración y ejecución | `package.json`, `docker-compose.yml` | Terminado | Orquesta la ejecución local de frontend y backend, y levanta MySQL 8.4 con el esquema inicial. |
| Base de datos y catálogo de seguridad | `database/schema.sql` | Terminado | Crea las tablas de roles, permisos, usuarios, relación rol-permiso, solicitudes de recuperación y bitácora. Inserta los roles Jefe, Mecánico y Cliente. |
| Conexión MySQL | `backend/src/db.js` | Terminado | Crea el pool de conexiones MySQL a partir de variables de entorno. |
| Autenticación | `backend/src/auth.js`, `backend/src/server.js` | Terminado | Genera y valida JWT con vigencia de 8 horas; consulta el usuario activo y sus permisos en cada solicitud protegida. |
| Recuperación de contraseña | `backend/src/server.js` | Terminado con entrega de correo pendiente | Registra una solicitud, requiere autorización de un usuario con permiso y permite completar el cambio con token válido. El envío de correo del token no está implementado. |
| Administración de usuarios | `backend/src/server.js` | Terminado como API | Permite consultar y crear usuarios a quien tenga `users.manage`; las altas exigen una justificación para bitácora. No tiene pantalla de gestión conectada. |
| Bitácora de seguridad | `backend/src/auth.js`, `backend/src/server.js`, `database/schema.sql` | Terminado como API | Registra actor, acción, entidad, justificación, datos antes/después y fecha. La consulta se restringe con `audit.view`. |
| Frontend de acceso | `frontend/src/main.jsx` | Terminado | Presenta formulario de inicio de sesión, guarda el JWT en `localStorage`, muestra errores y permite cerrar sesión. |
| Tablero inicial | `frontend/src/main.jsx`, `frontend/src/styles.css` | Terminado como interfaz de demostración | Muestra indicadores y órdenes recientes estáticas; los datos no se consultan desde la API. |
| Navegación y permisos visuales | `frontend/src/main.jsx` | Terminado | Oculta las opciones administrativas si el usuario no tiene `users.manage`. |
| Órdenes de trabajo | `frontend/src/main.jsx` | Pendiente | El formulario "Nueva orden" es visual y no envía datos. No hay modelo, tabla, endpoints ni persistencia de órdenes. |
| Vehículos, checklists y refacciones | `frontend/src/main.jsx`, `database/schema.sql` | Pendiente | Hay opciones de menú y permisos relacionados, pero no existe implementación funcional ni estructura de datos. |

## 4. Datos identificados

La base de datos MySQL definida para esta fase se llama `taller_oro`. Sus entidades y datos son:

| Entidad | Datos principales | Uso |
| --- | --- | --- |
| `roles` | `id`, `code`, `name`, `description` | Define los perfiles BOSS, MECHANIC y CLIENT. |
| `permissions` | `id`, `code`, `description` | Define permisos como gestión de usuarios, consulta de bitácora y autorización de recuperación. |
| `role_permissions` | `role_id`, `permission_id` | Relaciona cada rol con sus permisos. |
| `users` | `id`, `full_name`, `email`, `password_hash`, `role_id`, `active`, fechas de acceso y auditoría | Identidad y estado de los usuarios. Las contraseñas se almacenan como hash bcrypt. |
| `password_reset_requests` | usuario, hash del token, vigencia, estado, autorización y fechas | Controla las solicitudes de recuperación de contraseña. |
| `audit_log` | actor, acción, entidad, justificación, datos antes/después y fecha | Conserva la trazabilidad de las acciones registradas. |

No existen aún tablas ni datos persistentes para clientes, vehículos, órdenes, servicios, checklists o refacciones.

## 5. Código generado y comportamiento

### Backend

- `backend/src/server.js` inicializa Express, CORS, Helmet y un límite de 20 solicitudes de autenticación por 15 minutos.
- `POST /api/auth/login` valida correo y contraseña, actualiza el último acceso, registra el inicio de sesión y devuelve token JWT junto con el usuario y sus permisos.
- `GET /api/auth/me` devuelve la sesión autenticada.
- `POST /api/auth/password-reset/request` crea una solicitud de recuperación. El token se guarda únicamente como hash y no se expone en la respuesta.
- `GET /api/password-resets` y `POST /api/password-resets/:id/authorize` atienden la autorización de recuperaciones para usuarios autorizados.
- `POST /api/auth/password-reset/complete` actualiza la contraseña cuando el token autorizado está vigente.
- `GET /api/users` y `POST /api/users` cubren consulta y alta de usuarios, protegidas por `users.manage`.
- `GET /api/audit` consulta hasta 100 registros de bitácora, protegido por `audit.view`.
- `GET /api/health` comprueba la conexión con MySQL.

### Frontend

- `frontend/src/main.jsx` contiene la aplicación React y consume la API mediante `fetch`.
- La URL de la API se obtiene de `VITE_API_URL`; si no existe, usa `http://localhost:4000/api`.
- El token se almacena con la clave local `taller_token` y se adjunta como `Authorization: Bearer <token>`.
- El tablero y la lista de órdenes mostrada son datos estáticos, por lo que no representan registros almacenados en MySQL.

## 6. Credenciales y conexión a la base de datos

El archivo destinado a las credenciales reales del proyecto es **`.env` en la raíz del repositorio**. No está incluido en GitHub porque `.gitignore` lo excluye. Para crearlo, copie `.env.example` a `.env` y reemplace todos los valores de desarrollo por secretos propios.

Los valores de referencia de desarrollo están en los siguientes archivos:

| Archivo | Contenido |
| --- | --- |
| `.env.example` | Variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`, `INITIAL_BOSS_EMAIL` e `INITIAL_BOSS_PASSWORD`. |
| `docker-compose.yml` | Credenciales de desarrollo de MySQL para el contenedor local. |
| `backend/src/db.js` | Lee las variables `DB_*`; contiene valores predeterminados solo para desarrollo. |

Para conectarse localmente a MySQL use los datos definidos en `.env` o, si se ejecuta Docker sin un `.env`, los valores de desarrollo de `docker-compose.yml`: host `127.0.0.1`, puerto `3306`, base `taller_oro` y usuario `taller_app`. Las claves incluidas en el repositorio son de desarrollo y deben cambiarse antes de publicar.

## 7. Publicación recomendada

### Frontend: Vercel

Software recomendado: [Vercel](https://vercel.com/). Es adecuado para el frontend React construido con Vite.

1. Cree un proyecto en Vercel e importe el repositorio de GitHub.
2. Establezca `frontend` como **Root Directory**.
3. Configure el comando de construcción como `npm run build` y el directorio de salida como `dist`.
4. En las variables de entorno de Vercel cree `VITE_API_URL` con la URL pública del backend seguida de `/api`; por ejemplo, `https://api-su-dominio/api`.
5. Publique el proyecto y conserve la URL generada para configurarla como `FRONTEND_URL` en el backend.

### Backend y MySQL: Railway

Software recomendado: [Railway](https://railway.com/). Permite desplegar un servicio Node.js desde GitHub y añadir una base de datos MySQL en el mismo proyecto.

1. Cree un proyecto en Railway y agregue una base de datos MySQL.
2. Agregue un servicio desde este repositorio de GitHub y defina `backend` como **Root Directory**.
3. Use `npm ci` como comando de construcción y `npm start` como comando de inicio.
4. Configure en Railway: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `INITIAL_BOSS_EMAIL`, `INITIAL_BOSS_PASSWORD` y `FRONTEND_URL`.
5. Obtenga los valores `DB_*` desde el servicio MySQL de Railway; no copie los valores de desarrollo de `.env.example` a producción.
6. Establezca `FRONTEND_URL` con la URL final de Vercel, publique el backend y compruebe `https://<dominio-backend>/api/health`.
7. Vuelva a publicar el frontend después de definir `VITE_API_URL` con la URL definitiva del backend.

Antes de publicar, cambie `JWT_SECRET`, las contraseñas iniciales y todas las claves de MySQL. Las credenciales no deben guardarse en archivos versionados ni enviarse al repositorio.

## 8. Siguiente fase propuesta

1. Modelar y crear las tablas de clientes, vehículos, órdenes de trabajo, servicios, checklists y refacciones.
2. Implementar endpoints y validaciones para esos módulos.
3. Sustituir las métricas y órdenes estáticas del frontend por consultas a la API.
4. Crear las pantallas de administración de usuarios, bitácora y autorización de recuperaciones.
5. Integrar un proveedor de correo para entregar de forma segura los tokens de recuperación.
6. Agregar pruebas automatizadas de API, permisos y flujos de inicio de sesión.
