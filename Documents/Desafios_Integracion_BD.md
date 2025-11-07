# Desafíos de Integración de Base de Datos en OwnerIQ

## Contexto

La aplicación OwnerIQ utiliza una base de datos con un diseño específico que requiere una correcta integración con el frontend. A continuación, se detallan los desafíos identificados y sus soluciones.

## Desafíos Principales

### 1. Discrepancia entre nombres de tablas

**Problema**: El código frontend hace referencia a tablas como `profiles` y `addresses` que no existen en el esquema actual de la base de datos.

**Realidad**: El esquema utiliza las tablas `person` (con discriminador `kind='user'`) y `person_address`.

**Impacto**: Errores al intentar realizar operaciones CRUD en tablas inexistentes.

### 2. Diferencias en campos y claves

**Problema**: El código frontend utiliza campos como:
- `user_id` cuando debería ser `person_id`
- `entity_id` y `entity_type` cuando estos campos no existen

**Realidad**: La tabla `person` usa `person_id` como clave primaria, y la discriminación se hace mediante el campo `kind`.

**Impacto**: Errores al intentar consultar o actualizar campos inexistentes.

### 3. Manejo de discriminadores

**Problema**: La aplicación no utiliza correctamente el sistema de discriminadores para identificar tipos de registros.

**Realidad**: La tabla `person` usa el campo `kind` para diferenciar entre 'user', 'individual', 'organization', etc.

**Impacto**: Consultas incompletas que pueden devolver resultados erróneos o ningún resultado.

## Soluciones Implementadas

### 1. Adaptación de Nombres de Tablas

Se ha implementado un enfoque de adaptador donde:

- Referencias a `profiles` redirigen a `person` con discriminador `kind='user'`
- Referencias a `addresses` redirigen a `person_address`

### 2. Mapeo de Campos

Se han mapeado los campos utilizados en el frontend a sus equivalentes en la base de datos:

| Frontend | Backend | Notas |
|----------|---------|-------|
| `user_id` | `person_id` | Clave primaria de usuario |
| `entity_id` | `person_id` | En contexto de direcciones |
| `entity_type` | N/A | Reemplazado por discriminador `kind` |

### 3. Implementación de Filtros por Discriminador

Se han modificado las consultas para incluir el discriminador adecuado:

```javascript
// Antes (incorrecto)
.from('profiles')
.select('*')
.eq('user_id', user.id)

// Después (correcto)
.from('person')
.select('*')
.eq('person_id', user.id)
.eq('kind', 'user')
```

### 4. Pruebas de Integración

Se ha verificado que los cambios funcionen correctamente mediante:

1. Pruebas de operaciones CRUD en perfiles de usuario
2. Validación de operaciones con direcciones
3. Verificación del manejo correcto de discriminadores

## Impacto y Beneficios

1. **Corrección de Errores**: Eliminación de errores causados por tablas o campos inexistentes.
2. **Integridad de Datos**: Aseguramiento de que los datos se almacenan en las ubicaciones correctas.
3. **Modelo Consistente**: Alineación del código frontend con el modelo real de la base de datos.
4. **Escalabilidad**: El uso de discriminadores permite una estructura más flexible y adaptable.

## Recomendaciones Futuras

1. **Documentación de Esquema**: Mantener actualizada la documentación del esquema para referencia del equipo.
2. **Capa de Abstracción**: Implementar una capa de abstracción más robusta entre el frontend y la base de datos.
3. **Validación Automática**: Agregar pruebas automatizadas para validar la integridad de las operaciones de base de datos.
4. **Migraciones Controladas**: Planificar cuidadosamente los cambios de esquema para evitar discrepancias futuras.