# Aclaración sobre la Relación entre Usuario y Persona en OwnerIQ

Este documento clarifica la relación entre las entidades Usuario (User) y Persona (Person) en el modelo de datos de OwnerIQ, explicando cómo interactúan y sus diferencias conceptuales.

## Estructura Actual

En el modelo de datos actual de OwnerIQ, existen dos conceptos relacionados pero distintos:

### 1. Usuario (User)

- Gestionado por la tabla `auth.users` de Supabase Auth
- Representa una cuenta de acceso al sistema
- Contiene credenciales de autenticación (email, contraseña)
- Incluye metadatos básicos del usuario (nombre, preferencias)
- Tiene un `user_id` único (UUID) asignado por Supabase

### 2. Persona (Person)

- Gestionado por la tabla `person` (o alternativamente `profiles`)
- Representa una entidad en el contexto del negocio inmobiliario
- Utiliza un discriminador `kind` para diferenciar entre diferentes tipos:
  - `kind = 'user'`: Información de perfil del usuario del sistema
  - `kind = 'borrower'`: Prestatario (cliente que obtiene préstamos)
  - `kind = 'lender'`: Prestamista (institución financiera)
- Puede o no estar asociada a un usuario del sistema

## Aclaración del Patrón Discriminador

La tabla `person` utiliza un **patrón discriminador** (también conocido como herencia de tabla única) donde un solo campo (`kind`) determina qué tipo de persona es y, por lo tanto, qué campos son relevantes:

```
┌───────────────────────────────┐
│           PERSON              │
├───────────────────────────────┤
│ person_id (PK)                │
│ kind ('user'|'borrower'|'lender')│
│ user_id (FK, optional)        │
│ full_name                     │
│ first_name                    │
│ last_name                     │
│ primary_email                 │
│ primary_phone                 │
│ created_at                    │
└───────────────────────────────┘
```

- Para `kind = 'user'`: Se utilizan `full_name`, `primary_email`, `primary_phone` y `user_id` referencia a `auth.users`
- Para `kind = 'borrower'`: Se utilizan `first_name`, `last_name` y campos relacionados
- Para `kind = 'lender'`: Se utiliza principalmente `full_name` (nombre de institución)

## Relación entre User y Person

### Caso 1: Perfil de Usuario (kind = 'user')

Cuando una persona tiene `kind = 'user'`, representa el perfil de un usuario del sistema:

1. Se crea un registro en `auth.users` cuando el usuario se registra
2. Se crea un registro correspondiente en `person` con `kind = 'user'`
3. El campo `user_id` en `person` apunta al `id` en `auth.users`

**Ejemplo:**
```
auth.users:
  id: 'abc123'
  email: 'juan@example.com'
  
person:
  person_id: 'xyz789'
  kind: 'user'
  user_id: 'abc123'  <-- Referencia a auth.users
  full_name: 'Juan Pérez'
  primary_email: 'juan@example.com'
```

### Caso 2: Entidades de Negocio (kind ≠ 'user')

Cuando una persona tiene `kind = 'borrower'` o `kind = 'lender'`, representa una entidad externa:

1. No requiere un usuario asociado en el sistema
2. El campo `user_id` puede ser NULL
3. Representa un contacto o entidad con la que el usuario interactúa

**Ejemplo:**
```
person:
  person_id: 'def456'
  kind: 'borrower'
  user_id: NULL  <-- No tiene usuario asociado
  first_name: 'Carlos'
  last_name: 'Sánchez'
  
person:
  person_id: 'ghi789'
  kind: 'lender'
  user_id: NULL  <-- No tiene usuario asociado
  full_name: 'Banco Nacional'
  primary_phone: '555-1234'
```

## Confusión con la tabla Profiles

La confusión en el código surge porque anteriormente existía una tabla dedicada `profiles` para almacenar información de perfil de usuario:

```
┌───────────────────────────┐
│         PROFILES          │
├───────────────────────────┤
│ user_id (PK, FK)          │
│ full_name                 │
│ primary_email             │
│ primary_phone             │
│ created_at                │
└───────────────────────────┘
```

Durante el desarrollo, el modelo evolucionó para utilizar una tabla `person` con un discriminador, pero partes del código aún intentan interactuar con la tabla `profiles`.

## Recomendación para la Normalización

Para resolver esta inconsistencia, recomendamos:

1. **Estrategia a corto plazo**: Implementar el adaptador mencionado en `Implementacion_Solucion.md` para manejar ambas estructuras.

2. **Estrategia a largo plazo**: Normalizar el modelo decidiendo entre:
   
   **Opción A**: Mantener el patrón discriminador con la tabla `person`:
   - Actualizar todo el código para usar consistentemente la tabla `person`
   - Asegurar filtrado adecuado por `kind`

   **Opción B**: Volver a tablas separadas:
   - `profiles` para perfiles de usuario
   - `borrowers` para prestatarios
   - `lenders` para prestamistas

## Conclusión

El modelo actual de OwnerIQ utiliza un patrón discriminador en la tabla `person` para representar diferentes tipos de entidades, incluyendo los perfiles de usuario. La comprensión clara de esta estructura es esencial para implementar correctamente las operaciones de base de datos y mantener la consistencia de los datos.