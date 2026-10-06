# Taller Oro · Fases 1 y 2

Sistema de acceso y registro de clientes para un taller mecánico: autenticación con contraseñas hasheadas (bcrypt), JWT, roles, permisos, recuperación de contraseña autorizada y bitácora de seguridad.

## Documentación del Registro de Clientes

- [Diagrama de componentes en español](docs/diagrama-componentes-clientes.md)
- [Diagrama interactivo en español](docs/diagrama-interactivo-clientes.html)
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

---

# Taller Oro · Fase 3: Administración de Clientes y Talleres

La Fase 3 se incorpora sin alterar las fases anteriores. Agrega administración de Clientes y Talleres, autorregistro de Clientes, perfil propio, asociación multi-taller, auditoría funcional y consultas SEPOMEX persistentes.

## Documentación de la Fase 3

- [Diagrama interactivo de Fase 3](docs/diagrama-interactivo-clientes.html)
- [Diagrama y arquitectura de Fase 3](docs/fase-3-diagrama-y-arquitectura.md)
- [Especificación de Administración de Clientes y Talleres](docs/fase-3-administracion-clientes-talleres.md)
- [Migración de Clientes, Talleres y actividades](database/migrations/20261005_phase3_customer_workshops.sql)
- [Migración de caché SEPOMEX](database/migrations/20261006_sepomex_persistent_cache.sql)

## Resumen de funcionalidades

| Sección | Lo realizado | Resultado |
|---|---|---|
| Clientes administrativos | Administrador, Secretaria y Recepcionista pueden registrar clientes autenticados. | Expedientes con CURP, RFC, contactos, dirección, foto y validaciones. |
| Autorregistro | Login ofrece `Registrarme como cliente`. | Se crea únicamente el rol `CLIENT` con contraseña hash bcrypt. |
| Mi perfil | El Cliente completa y actualiza solamente sus propios datos. | No puede consultar otros clientes ni áreas administrativas. |
| Administración de Clientes | Búsqueda, filtros, paginación, edición, asociación de taller y estatus. | Máximo 10 registros por página desde MySQL. |
| Administración de Talleres | Alta, consulta, edición, foto, RFC, dirección y estatus. | Opción visible en `Administración -> Talleres`. |
| SEPOMEX | Listas Estado, Municipio y Colonia; flujo por CP o por dirección. | Las consultas ya usadas se almacenan localmente. |
| Auditoría | Altas, cambios, asociaciones y estatus dejan evidencia. | Acciones registradas en `actividades_clientes` y `audit_log`. |

## Roles y permisos de Fase 3

| Rol | Alcance específico |
|---|---|
| Administrador del Sistema | Consulta todos los clientes, edita, asocia o cambia taller, activa/suspende y administra Talleres. |
| Secretaria | Registra clientes y consulta los correspondientes a sus talleres asignados. |
| Recepcionista | Registra clientes y consulta los correspondientes a sus talleres asignados. |
| Cliente | Se autorregistra y administra exclusivamente `Mi perfil`. |

Las opciones se limitan en React y cada endpoint vuelve a validar JWT, rol y permisos en Express. Ocultar un botón no concede acceso.

## Tablas y datos agregados en Fase 3

| Tabla | Para qué se usa | Datos principales |
|---|---|---|
| `customers` | Expediente del cliente. | Nombres, CURP, RFC, fecha, edad calculada, teléfonos, correo, dirección, estatus y `user_id` opcional. |
| `workshops` | Administración de talleres. | Nombre, razón social, RFC, teléfono, correo, dirección, foto y estatus. |
| `customer_workshops` | Relación Cliente -> Taller. | `customer_id`, `workshop_id`; permite asociación sin duplicar el cliente. |
| `user_workshops` | Alcance de personal por taller. | Limita los clientes que Secretaria y Recepcionista pueden consultar. |
| `actividades_clientes` | Auditoría funcional de Fase 3. | Usuario, cliente, taller, acción, descripción y fecha. |
| `sepomex_cache` | Caché persistente de consultas postales. | Estados, municipios, CP y colonias ya solicitados, guardados como JSON. |

## Componentes, métodos y responsabilidad

| Archivo o método | Qué hace | Cómo se aplica |
|---|---|---|
| `CustomerAdministrationFacade.normalize` | Normaliza y valida datos de Cliente. | Convierte textos de negocio a MAYÚSCULAS, conserva el caso del correo, calcula edad y valida CURP/RFC/teléfonos. |
| `CustomerAdministrationFacade.create` | Registra un expediente. | Detecta duplicados, guarda foto segura y delega a `CustomerRepository`. |
| `CustomerAdministrationFacade.update` | Actualiza expediente autorizado. | Comprueba propiedad para el Cliente y conserva el control administrativo. |
| `CustomerRepository.page` | Consulta Clientes paginada. | Usa filtros, orden y `LIMIT 10 OFFSET` directamente en MySQL. |
| `CustomerRepository.replaceWorkshop` | Asocia o cambia taller. | Actualiza `customer_workshops` sin eliminar el expediente. |
| `WorkshopFacade.normalize` | Valida datos de Taller. | Revisa RFC, email, teléfono, dirección y estatus. |
| `WorkshopRepository.page` | Consulta Talleres paginada. | Devuelve solamente los registros de la página solicitada. |
| `PostalDirectoryFacade` | Prepara respuestas postales para la vista. | Agrupa colonias, localidades y códigos postales disponibles. |
| `SepomexRepository.readPersisted` | Consulta primero la caché local. | Lee `sepomex_cache` antes de solicitar datos por Internet. |
| `SepomexRepository.savePersisted` | Guarda consultas SEPOMEX. | Inserta o actualiza la respuesta ya consultada sin descargar el catálogo nacional completo. |

## Flujo de la Fase 3

`Vista React -> API Express -> JWT / Roles -> Facade -> Repository -> MySQL`

La vista captura o consulta información. La API autoriza la sesión; el Facade aplica reglas, normalización y validaciones; el Repository ejecuta consultas seguras; MySQL conserva expedientes, relaciones, actividades y caché postal. El [diagrama interactivo](docs/diagrama-interactivo-clientes.html) permite recorrer cada paso de forma visual.

## Endpoints principales de Fase 3

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/auth/client-register` | Autorregistro público con rol `CLIENT`. |
| `GET/POST/PUT` | `/api/customers/me` | Perfil propio del Cliente. |
| `GET/POST` | `/api/customers` | Consulta paginada y registro por personal autorizado. |
| `PUT` | `/api/customers/:id` | Edición administrativa de cliente. |
| `PATCH` | `/api/customers/:id/status` | Activación o suspensión lógica. |
| `PUT` | `/api/customers/:id/workshop` | Asociación o cambio de taller. |
| `GET/POST` | `/api/workshops` | Consulta paginada y registro de Talleres. |
| `PUT/PATCH` | `/api/workshops/:id` y `/api/workshops/:id/status` | Edición y cambio de estatus del Taller. |
| `GET` | `/api/postal/*` | Dirección SEPOMEX con caché persistente. |

## Aplicar Fase 3 a una instalación existente

Después de ejecutar las migraciones de Fases 1 y 2, aplica una vez y en este orden:

1. `database/migrations/20261005_phase3_customer_workshops.sql`
2. `database/migrations/20261006_sepomex_persistent_cache.sql`

En una instalación nueva, `database/schema.sql` ya incluye la estructura completa.
