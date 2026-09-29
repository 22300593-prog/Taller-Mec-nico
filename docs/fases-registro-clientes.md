# Fases del Registro de Clientes

| Fase | Actividades realizadas | Entregable | Estado |
| --- | --- | --- | --- |
| 1. Revisión de la base | Se revisaron la autenticación JWT, permisos, bitácora y el esquema inicial de la fase anterior. | Compatibilidad con la estructura existente de React, Express y MySQL. | Completada |
| 2. Seguridad y acceso | Se agregaron los roles Administrador del Sistema y Recepcionista; las rutas y la navegación de clientes se restringen a esos roles. | Protección de API y de la vista. | Completada |
| 3. Modelo de datos | Se crearon `customers`, `workshops` y `customer_workshops`, además de una migración para instalaciones ya existentes. | Registro persistente y relación multi-taller futura. | Completada |
| 4. Backend | Se implementaron `CustomerRegistrationFacade` y `CustomerRepository`, validación de datos, detección de duplicados, carga de foto y bitácora. | API de clientes con flujo Vista -> Facade -> Repository. | Completada |
| 5. Interfaz | Se agregó la pantalla de listado y formulario de alta, validación de formato, cálculo de edad y aviso de éxito. | Registro funcional para usuarios autorizados. | Completada |
| 6. Inicio de sesión y altas internas | Se cambió la cuenta inicial al rol Administrador del Sistema. El alta de usuarios internos ya estaba protegida por `users.manage`; no se abrió al público. | Acceso coherente con los roles solicitados. | Completada |
| 7. Dependencia y documentación | Se instaló `archify` y se documentaron componentes, reglas, migración y fases. | Paquete instalado y documentos del módulo. | Completada |

## Validaciones incluidas

- Nombre, contacto alternativo y cada parte de la dirección son obligatorios.
- Fecha de nacimiento válida, no futura, y edad consistente con la fecha.
- Teléfonos mexicanos de 10 dígitos; los campos de trabajo son opcionales.
- Correos personales y de trabajo con formato válido y diferentes entre sí.
- Código postal de exactamente cinco dígitos.
- Foto requerida en JPG, PNG o WEBP, con máximo de 15 MB.
- No se permite repetir correo personal, correo de trabajo o teléfono personal en otro cliente.

## Aplicación en una instalación existente

Ejecuta [20260928_customer_registration.sql](/home/arojas/Documentos/taller%20mecanico/database/migrations/20260928_customer_registration.sql) una vez sobre la base existente. En una instalación nueva, [schema.sql](/home/arojas/Documentos/taller%20mecanico/database/schema.sql) ya contiene toda la estructura.
