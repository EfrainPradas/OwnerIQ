# Instrucciones para Aplicar Correcciones en App.js

Estas instrucciones te guiarán para aplicar las correcciones necesarias en el archivo App.js para resolver los errores de tablas no encontradas.

## Problema

El código está intentando usar las tablas `profiles` y `addresses` que no existen en la base de datos. En su lugar, debe usar:

- Tabla `person` (con `kind='user'`) para perfiles
- Tabla `person_address` para direcciones

## Pasos para Aplicar las Correcciones

### 1. Abre el archivo App.js

```bash
code frontend/src/App.js
```

### 2. Encuentra y reemplaza la función fetchProfileData

**Busca**: La función `fetchProfileData` en el componente `ProfileView` (aproximadamente líneas 3550-3600).

**Reemplaza con**: El contenido del archivo `Correccion_FetchProfile_App.js`

**Pistas para encontrar la función original**:
- Comienza con `const fetchProfileData = async () => {`
- Contiene llamadas a `supabase.from('profiles').select('*')`
- Contiene llamadas a `supabase.from('addresses').select('*')`

### 3. Encuentra y reemplaza la función handleProfileUpdate

**Busca**: La función `handleProfileUpdate` en el componente `ProfileView` (aproximadamente líneas 3650-3700).

**Reemplaza con**: El contenido del archivo `Correccion_Perfil_App.js`

**Pistas para encontrar la función original**:
- Comienza con `const handleProfileUpdate = async (e) => {`
- Contiene actualizaciones a `supabase.auth.updateUser`
- Contiene una operación de `upsert` en la tabla `profiles`

### 4. Encuentra y reemplaza las funciones de manejo de direcciones

**Busca**: Las funciones `handleAddressSubmit` y `handleDeleteAddress` en el componente `ProfileView`.

**Reemplaza con**: El contenido del archivo `Correccion_AddressHandling_App.js`

**Pistas para encontrar las funciones originales**:
- `handleAddressSubmit`: Contiene operaciones en la tabla `addresses`
- `handleDeleteAddress`: Contiene operaciones de `delete` en la tabla `addresses`

### 5. Verifica que no haya errores de sintaxis

Después de reemplazar el código, verifica que:

- No haya llaves, paréntesis o corchetes sin cerrar
- Las variables usadas en las funciones nuevas existan en el ámbito
- No haya imports faltantes

### 6. Guarda el archivo y prueba

1. Guarda los cambios en App.js
2. Comprueba si hay errores de compilación en la consola de desarrollo
3. Navega a la sección de Perfil en la aplicación
4. Intenta actualizar tu información personal
5. Intenta añadir/editar/eliminar direcciones

### 7. Depuración si persisten los errores

Si sigues viendo errores en la consola, verifica:

1. Que todas las instancias de `profiles` hayan sido reemplazadas por `person` con el filtro `kind='user'`
2. Que todas las instancias de `addresses` hayan sido reemplazadas por `person_address`
3. Que los campos mapeados sean correctos (por ejemplo, `address_id` vs `id`)

## Consejos adicionales

- Las funciones corregidas incluyen más logs para ayudar con la depuración
- Si hay errores específicos que no se resuelven, revisa la consola para ver qué tabla o campo está causando problemas
- Recuerda que la tabla `person` utiliza un discriminador `kind` para diferenciar tipos, siempre debes incluir `.eq('kind', 'user')` al consultar perfiles de usuario
- Para direcciones, `person_address` utiliza `person_id` y `person_type` en lugar de `entity_id` y `entity_type`