# Diagrama de Componentes: Registro de Clientes

```mermaid
flowchart LR
    V[Vista React\nCustomerRegistration] -->|multipart/form-data| C[API Express\nPOST /api/customers]
    C -->|JWT + roles| A[authenticate + allowRoles]
    A --> F[CustomerRegistrationFacade]
    F -->|validación de formato, edad\ny duplicados| R[CustomerRepository]
    R --> D[(MySQL\ncustomers)]
    F -->|foto JPG/PNG/WEBP\nmax. 15 MB| S[Almacenamiento privado\nuploads/customers]
    C -->|CREATE_CUSTOMER| B[(audit_log)]
    D --> M[(customer_workshops)]
    M --> T[(workshops)]
    C -->|Cliente registrado exitosamente| V
```

La vista no contiene SQL ni reglas de duplicación. El Facade concentra la validación y la coordinación del registro; el Repository encapsula el acceso a MySQL. La tabla `customer_workshops` permite asociar uno o varios talleres sin modificar el expediente del cliente cuando esa operación se incorpore.
