# Diagrama de Componentes: Registro de Clientes

Este diagrama describe el flujo completo del módulo, desde la pantalla que usa el personal autorizado hasta el almacenamiento de los datos y la fotografía.

```mermaid
flowchart TB
    subgraph Vista["Vista web"]
        Pantalla["Pantalla Registro de Clientes\nReact: CustomerRegistration"]
        Aviso["Aviso en pantalla\nCliente registrado exitosamente"]
    end

    subgraph Seguridad["Seguridad"]
        Sesion["JWT\nUsuario autenticado"]
        Rol["Validación de rol\nAdministrador del Sistema\no Recepcionista"]
    end

    subgraph Aplicacion["API y reglas de negocio"]
        Ruta["POST /api/customers\nExpress"]
        Fachada["CustomerRegistrationFacade\nValida y coordina el registro"]
        Repositorio["CustomerRepository\nConsultas SQL"]
    end

    subgraph Datos["Datos y archivos"]
        Clientes[("customers\nExpediente del cliente")]
        Bitacora[("audit_log\nCREATE_CUSTOMER")]
        Fotos["uploads/customers\nFoto privada"]
        Relacion[("customer_workshops\nRelación futura")]
        Talleres[("workshops\nTalleres futuros")]
    end

    Pantalla -->|"Formulario y foto"| Ruta
    Sesion --> Ruta
    Ruta --> Rol
    Rol -->|"Acceso autorizado"| Fachada
    Fachada -->|"Formato, edad, foto menor o igual a 15 MB\ny correos/teléfonos duplicados"| Repositorio
    Fachada -->|"JPG, PNG o WEBP"| Fotos
    Repositorio --> Clientes
    Ruta -->|"Registro de la acción"| Bitacora
    Clientes --> Relacion
    Relacion --> Talleres
    Ruta -->|"Respuesta exitosa"| Aviso

    classDef vista fill:#e8f1fb,stroke:#2c5f8a,color:#172a3a;
    classDef seguridad fill:#fff2cc,stroke:#a67c00,color:#3b2c00;
    classDef aplicacion fill:#eaf4ea,stroke:#397a42,color:#123b1b;
    classDef datos fill:#f4e8f5,stroke:#8a4b91,color:#3d1742;
    class Pantalla,Aviso vista;
    class Sesion,Rol seguridad;
    class Ruta,Fachada,Repositorio aplicacion;
    class Clientes,Bitacora,Fotos,Relacion,Talleres datos;
```

## Cómo leerlo

1. La Recepcionista o el Administrador del Sistema captura los datos y la foto en la pantalla.
2. La API comprueba que la sesión esté activa y que el rol esté autorizado.
3. El Facade valida formatos, edad, duplicados y la foto antes de persistir nada.
4. El Repository guarda el expediente del cliente en MySQL; la foto queda fuera de la base de datos con nombre aleatorio.
5. La API registra la operación en la bitácora y devuelve el mensaje de éxito a la pantalla.
6. La relación `customer_workshops` deja preparada la asociación de un cliente con uno o varios talleres cuando se habilite esa función.

## Archivos relacionados

| Archivo | Responsabilidad |
| --- | --- |
| `frontend/src/main.jsx` | Pantalla, formulario y mensaje de éxito. |
| `backend/src/server.js` | Rutas HTTP, autenticación, roles, carga de foto y bitácora. |
| `backend/src/modules/customers/customerRegistrationFacade.js` | Validaciones y orquestación del registro. |
| `backend/src/modules/customers/customerRepository.js` | Persistencia de clientes y consulta de duplicados. |
| `database/schema.sql` | Tablas de clientes, talleres y relación multi-taller. |
