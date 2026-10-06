# Fase 3: Administración de Clientes y Talleres

## Funcionalidades desarrolladas

- Registro de clientes por Administrador, Secretaria o Recepcionista autenticados.
- Autorregistro público desde Login mediante **Registrarme como cliente**. El rol se asigna en backend como `CLIENT`; el formulario no recibe ni acepta un rol.
- Mi perfil para que el Cliente complete o actualice exclusivamente su propio expediente. No existe una ruta de listado para ese rol.
- Clientes: edición administrativa, asociación o cambio de taller, suspensión y reactivación sin eliminación física.
- Administración -> Talleres visible para Administrador: alta, consulta, búsqueda, edición, estatus y paginación desde backend.
- Dirección de Clientes y Talleres conectada a SEPOMEX mediante Estado, Municipio y Colonia desplegables, con los dos flujos CP -> dirección y dirección -> CP.

## Roles y permisos

| Rol | Acceso de Fase 3 |
| --- | --- |
| `SYSTEM_ADMIN` | Clientes globales, edición, asociación, suspensión/activación y Administración -> Talleres. |
| `SECRETARY` / `RECEPTIONIST` | Registro y consulta de clientes asignados a sus talleres por `user_workshops`. |
| `CLIENT` | Autorregistro, Login y `Mi perfil` propio. No puede consultar clientes, Talleres ni acciones administrativas. |

La interfaz oculta opciones no autorizadas, pero la protección real está en JWT, `authenticate` y `allowRoles` en cada endpoint.

## Normalización global

`backend/src/shared/normalization.js` centraliza las reglas y se reutiliza desde Facades y usuarios. Los nombres, apellidos, CURP, RFC, dirección, localidad, razón social, taller, contactos y descripciones equivalentes se guardan en MAYÚSCULAS, sin espacios externos o duplicados. La comprobación de duplicados ocurre después de normalizar.

El correo solo elimina espacios externos y conserva exactamente sus mayúsculas/minúsculas. Contraseñas, hashes, JWT, tokens, URL y archivos no se transforman. Los teléfonos se guardan como diez dígitos mexicanos.

## Datos y validaciones

El expediente incluye nombres, apellidos, CURP, RFC, fecha de nacimiento, edad calculada, email, teléfonos, dirección, localidad y contacto adicional. CURP, RFC, email, teléfono, fecha, obligatorios y duplicados se validan tanto en React como en backend. Las restricciones y consultas evitan duplicar principalmente CURP, RFC, email y teléfono.

El taller registra nombre, razón social, RFC, teléfono, correo, foto, dirección SEPOMEX y estatus. La foto admite JPG, PNG o WEBP con nombre UUID seguro. `MAX_TALLER_IMAGE_SIZE` es la constante central del límite actual de 15 GB.

## Flujo y paginación

`Vista -> API Express -> Facade -> Repository -> MySQL`.

Clientes y Talleres envían `page`, `limit`, búsqueda, estatus y filtros. Los repositorios usan `LIMIT` y `OFFSET`; el límite máximo es 10, por lo que el navegador nunca recibe todos los registros para paginarlos localmente.

`customer_workshops` conserva la relación Cliente -> Taller. El Administrador usa la lista cargada desde backend; no se capturan nombres manualmente. `user_workshops` aísla la consulta de Secretaria/Recepcionista y el Administrador general conserva la vista global.

## Auditoría y tablas

- `customers`: expediente extendido, estatus y enlace opcional a `users`.
- `workshops`: domicilio, datos fiscales, foto y estatus.
- `customer_workshops`: asociación Cliente -> Taller.
- `user_workshops`: alcance de personal por taller.
- `actividades_clientes`: `usuario_id`, `cliente_id`, `taller_id`, acción, descripción y fecha.

Se registran `CLIENTE_CREADO`, `CLIENTE_EDITADO`, `CLIENTE_SUSPENDIDO`, `CLIENTE_ACTIVADO`, `CLIENTE_ASOCIADO_TALLER`, `CLIENTE_CAMBIO_TALLER`, `TALLER_CREADO`, `TALLER_EDITADO`, `TALLER_SUSPENDIDO` y `TALLER_ACTIVADO` según corresponda. La migración incremental es `database/migrations/20261005_phase3_customer_workshops.sql`.

## Endpoints nuevos o modificados

| Método | Ruta | Alcance |
| --- | --- | --- |
| POST | `/api/auth/client-register` | Público; crea solo `CLIENT` con hash bcrypt. |
| GET/POST/PUT | `/api/customers/me` | Perfil del Cliente autenticado. |
| GET/POST | `/api/customers` | Listado paginado y alta para personal autorizado. |
| PUT | `/api/customers/:id` | Solo Administrador. |
| PATCH | `/api/customers/:id/status` | Suspender o activar, solo Administrador. |
| PUT | `/api/customers/:id/workshop` | Asociar o cambiar taller, solo Administrador. |
| GET | `/api/workshops/options` | Talleres activos para asociaciones autorizadas. |
| GET/POST | `/api/workshops` | Consulta paginada y alta de Talleres, Administrador. |
| PUT | `/api/workshops/:id` | Edición de taller, Administrador. |
| PATCH | `/api/workshops/:id/status` | Activar o suspender Taller, Administrador. |

## Archivos principales

- `frontend/src/main.jsx`
- `backend/src/server.js`
- `backend/src/shared/normalization.js`
- `backend/src/shared/customerValidation.js`
- `backend/src/modules/customers/customerAdministrationFacade.js`
- `backend/src/modules/customers/customerRepository.js`
- `backend/src/modules/workshops/workshopFacade.js`
- `backend/src/modules/workshops/workshopRepository.js`
