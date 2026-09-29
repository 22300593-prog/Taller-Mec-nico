# Registro de Clientes

## Acceso

Solo los usuarios autenticados con rol `SYSTEM_ADMIN` (Administrador del Sistema) o `RECEPTIONIST` (Recepcionista) pueden consultar o registrar clientes. La restricción se aplica tanto en la navegación de React como en la API; ocultar el menú no sustituye la autorización del servidor.

## Flujo técnico

1. `CustomerRegistration` prepara el `FormData`, incluida la foto, y llama a `POST /api/customers`.
2. La ruta valida JWT y rol, y entrega la solicitud a `CustomerRegistrationFacade`.
3. El Facade valida cada campo, normaliza correos y teléfonos, consulta duplicados, guarda la foto con un nombre aleatorio y solicita la persistencia.
4. `CustomerRepository` inserta o consulta datos mediante MySQL.
5. La ruta crea el evento `CREATE_CUSTOMER` en `audit_log` y devuelve el mensaje de éxito para la notificación de la vista.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/customers` | Lista los clientes para el rol autorizado. |
| `POST` | `/api/customers` | Registra un cliente con `multipart/form-data`. |
| `GET` | `/api/customers/:id/photo` | Entrega la fotografía únicamente a un rol autorizado. |

## Inicio de sesión y usuarios internos

El inicio de sesión conserva el mismo mecanismo seguro de JWT y ahora crea la cuenta inicial como Administrador del Sistema. La ruta de alta de usuarios internos ya exige el permiso `users.manage`; se mantiene cerrada al público porque abrirla permitiría crear cuentas operativas sin autorización. La Recepcionista recibe solamente el permiso de registro de clientes.
