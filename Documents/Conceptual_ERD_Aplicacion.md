# Modelo Entidad-Relación Conceptual para OwnerIQ

Este documento describe el modelo de datos de OwnerIQ desde una perspectiva conceptual, enfocándose en las principales entidades y sus relaciones.

## Entidades Principales

### 1. Persona (Person)

La entidad **Persona** es el componente central del modelo de datos. Representa a cualquier individuo u organización que interactúa con el sistema:

- **Usuarios**: personas que utilizan la aplicación
- **Propietarios**: personas que poseen propiedades
- **Prestamistas**: instituciones financieras o personas que proporcionan financiamiento
- **Prestatarios**: personas que reciben financiamiento

La tabla `person` utiliza un campo discriminador `kind` que permite distinguir entre estos diferentes roles. Este enfoque de "tabla única con discriminador" facilita consultas flexibles y permite que una persona desempeñe múltiples roles.

### 2. Dirección (Person_Address)

Las **Direcciones** están vinculadas a las personas. Una persona puede tener múltiples direcciones (domicilio, oficina, correspondencia, etc.).

### 3. Propiedad (Property)

Las **Propiedades** son los activos inmobiliarios gestionados en el sistema. Cada propiedad está vinculada a una persona (propietario) y puede tener:

- Información básica (dirección, tipo, características)
- Datos financieros (valoración, renta, impuestos)
- Métricas de rendimiento (calculadas a partir de los datos financieros)

### 4. Préstamo (Property_Loan)

Los **Préstamos** están asociados a propiedades específicas y contienen información sobre el financiamiento:

- Condiciones del préstamo (tasa de interés, plazo)
- Montos (principal, pagos mensuales)
- Relaciones con prestamistas

### 5. Portafolio (Portfolio)

Los **Portafolios** agrupan propiedades para su gestión conjunta. Un portafolio puede tener múltiples miembros con diferentes roles (propietario, gestor, visualizador).

## Relaciones Conceptuales

1. **Persona → Dirección**: Una persona puede tener múltiples direcciones.
   - Relación: Uno a muchos (1:N)
   - Implementación: Clave foránea `person_id` en `person_address`

2. **Persona → Propiedad**: Una persona puede poseer múltiples propiedades.
   - Relación: Uno a muchos (1:N)
   - Implementación: Clave foránea `person_id` en `property`

3. **Propiedad → Préstamo**: Una propiedad puede tener un préstamo asociado.
   - Relación: Uno a uno (1:1)
   - Implementación: Clave foránea `property_id` en `property_loan`

4. **Persona → Portafolio**: Una persona puede participar en múltiples portafolios, y un portafolio puede tener múltiples personas.
   - Relación: Muchos a muchos (N:M)
   - Implementación: Tabla de unión `portfolio_member` con claves foráneas a `person` y `portfolio`

## Modelo de Polimorfismo

El sistema utiliza un modelo de polimorfismo basado en discriminadores:

1. **Polimorfismo de Persona**: El campo `kind` en la tabla `person` identifica el tipo de persona:
   - 'individual': Persona física
   - 'organization': Entidad corporativa

2. **Personas con Múltiples Roles**: Una misma persona puede ser simultáneamente usuario del sistema, propietario de propiedades y prestamista/prestatario.

## Métricas y Análisis

El sistema incluye varias entidades para almacenar métricas y análisis:

- **Property_Metrics**: Métricas financieras calculadas (NOI, cap rate, cash flow)
- **Property_Valuation**: Historial de valoraciones de propiedades
- **Property_Rent_Estimate**: Estimaciones de renta de mercado
- **Property_Dealscore**: Puntuaciones para evaluar oportunidades de inversión

## Diagrama Conceptual de Alto Nivel

```
┌──────────┐     ┌────────────────┐     ┌─────────────┐
│          │     │                │     │             │
│  PERSON  │─────│   PROPERTIES   │─────│    LOANS    │
│          │     │                │     │             │
└──────────┘     └────────────────┘     └─────────────┘
     │                   │
     │                   │
     ▼                   ▼
┌──────────┐     ┌────────────────┐
│          │     │                │
│ ADDRESSES│     │    METRICS     │
│          │     │                │
└──────────┘     └────────────────┘
```

## Implicaciones para el Desarrollo

1. **Separación de Datos**: El modelo separa los datos básicos de las propiedades de sus métricas y análisis, permitiendo actualizaciones independientes.

2. **Flexibilidad en Relaciones**: El uso de discriminadores permite relaciones flexibles entre entidades.

3. **Historial y Auditoría**: Las entidades de métricas incluyen campos de fecha para mantener un historial de cambios.

4. **Extensibilidad**: El modelo puede extenderse fácilmente añadiendo nuevas entidades relacionadas sin modificar las existentes.

Este modelo conceptual proporciona una base sólida para comprender la estructura de datos de OwnerIQ y cómo las diferentes entidades interactúan entre sí.