# Fase 3: Administración de Clientes y Talleres

## Funcionalidades

- Expediente de cliente con nombres, apellidos, CURP, RFC, fecha de nacimiento, edad calculada, contactos y dirección SEPOMEX.
- Normalización de nombres y dirección a mayúsculas sin espacios duplicados; correos en minúsculas y teléfonos mexicanos de 10 dígitos.
- Duplicados bloqueados por CURP, RFC, email o teléfono personal.
- Consulta de clientes paginada por servidor: máximo 10 registros, búsqueda, estatus y orden A-Z/Z-A.
- Suspensión lógica de clientes mediante `ACTIVE` y `SUSPENDED`.
- Asociación y cambio de taller sin eliminar el expediente.
- Administración de talleres con RFC, razón social, dirección SEPOMEX, estatus y fotografía.

## Roles y permisos

| Rol | Alcance |
| --- | --- |
| Administrador del Sistema | Consulta global, edita, suspende, asocia clientes y administra talleres. |
| Secretaria / Recepcionista | Registra y consulta únicamente clientes asociados a sus talleres en `user_workshops`. |
| Cliente | Autenticado; crea o completa únicamente su propio expediente enlazado por `customers.user_id`. |

Los permisos se verifican en la vista y en rutas Express con JWT y `allowRoles`.

## Flujo de clientes

`Vista -> /api/customers -> CustomerAdministrationFacade -> CustomerRepository -> MySQL`.

El Facade valida y normaliza antes de persistir. La ruta registra la acción en `actividades_clientes` y en la bitácora existente. Las consultas usan `LIMIT 10 OFFSET` en MySQL; el frontend no pagina listas completas.

## SEPOMEX

La vista mantiene Estado, Municipio y Colonia como controles de selección. El CP completa los datos, y la combinación Estado -> Municipio -> Colonia completa el CP. Solo se persiste la dirección elegida: calle, colonia, municipio, estado, localidad y código postal. No se duplica el catálogo SEPOMEX en la base local.

## Asociación Cliente -> Taller

`customer_workshops` conserva la relación de cliente con taller. El Administrador usa el cambio de asociación; `user_workshops` limita los clientes visibles a Secretaria/Recepcionista. El Administrador no recibe este filtro y puede consultar todos los talleres.

## Nuevas tablas y cambios

- `actividades_clientes`: usuario, cliente, taller, acción, descripción y fecha.
- `user_workshops`: asignación de personal a talleres para aislamiento de datos.
- `customers`: CURP, RFC, nombres separados, localidad, contacto adicional, estatus y usuario enlazado.
- `workshops`: dirección, razón social, RFC, teléfono, correo, foto y estatus.

La migración es `database/migrations/20261005_phase3_customer_workshops.sql` y no elimina registros ni tablas existentes.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/customers?page=&status=&search=&sort=&workshopId=` | Consulta paginada y aislada por rol/taller. |
| POST | `/api/customers` | Registro de cliente autenticado. |
| PUT | `/api/customers/:id` | Edición del Administrador o del propio Cliente. |
| PATCH | `/api/customers/:id/status` | Suspensión lógica por Administrador. |
| PUT | `/api/customers/:id/workshop` | Asociación/cambio de taller por Administrador. |
| GET/POST | `/api/workshops` | Consulta y alta de talleres. |
| PUT | `/api/workshops/:id` | Edición de taller por Administrador. |

Las fotografías de taller se almacenan con nombre UUID y tipo JPG/PNG/WEBP. `MAX_WORKSHOP_PHOTO_BYTES` mantiene el límite solicitado de 15 GB como constante configurable.
