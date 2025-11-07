# Instrucciones para Verificar la Integración de Base de Datos en OwnerIQ

Después de implementar las correcciones para guardar datos en todas las tablas relacionadas, es importante verificar que el sistema esté funcionando correctamente. Estas instrucciones explican cómo utilizar las nuevas funcionalidades para verificar que los datos se están guardando correctamente.

## 1. Crear una nueva propiedad con datos completos

1. Iniciar sesión en la aplicación OwnerIQ
2. Navegar a la sección "Propiedades"
3. Hacer clic en "Agregar Propiedad"
4. Completar **todos** los campos del formulario, incluyendo:
   - Información básica de la propiedad
   - Información financiera
   - Información de hipoteca
   - Pagos extra
   - Información de gastos
5. Hacer clic en "Guardar Propiedad"
6. Confirmar que aparece un mensaje de éxito

## 2. Obtener el ID de la propiedad creada

Hay varias formas de obtener el ID de la propiedad recién creada:

- **Método 1:** Observar la respuesta en la consola del navegador (F12 > Console)
- **Método 2:** Inspeccionar la tarjeta de la propiedad en la interfaz de usuario (F12 > Elements)

El ID de la propiedad tendrá un formato similar a: `12345678-1234-1234-1234-123456789012`

## 3. Usar la herramienta de diagnóstico para verificar los datos

Hemos creado una herramienta especial para verificar que los datos se hayan guardado correctamente en todas las tablas relacionadas.

1. Abrir la herramienta de diagnóstico navegando a: `http://localhost:3000/debug.html`
2. Ingresar el ID de la propiedad en el campo "ID de la Propiedad"
3. Hacer clic en "Verificar Datos"
4. Revisar los resultados:
   
   ### Pestaña "Resumen"
   
   Muestra el estado general de cada tabla. Todas deberían mostrar "Datos Encontrados" si la integración está funcionando correctamente:
   - Propiedad (property)
   - Hipoteca (property_loan)
   - Valoración (property_valuation)
   - Estimación de Renta (property_rent_estimate)
   - Datos Operativos (property_operating_inputs)
   - Métricas Financieras (property_metrics)
   
   ### Pestañas específicas
   
   Cada pestaña muestra los datos específicos guardados en cada tabla correspondiente:
   - **Propiedad**: Datos básicos de la propiedad
   - **Hipoteca**: Información del préstamo/hipoteca
   - **Valoración**: Historial de valoraciones de la propiedad
   - **Renta**: Estimaciones de renta
   - **Operativos**: Datos de gastos operativos
   - **Métricas**: Métricas financieras calculadas (NOI, Cap Rate, DSCR, etc.)
   - **Raw**: Datos en formato JSON para análisis más detallado

## 4. Verificar la integridad de los datos

Para cada tabla, verifique que:

1. **Existan datos**: Debe haber al menos un registro en cada tabla
2. **Datos correctos**: Los valores deben corresponder con lo que ingresó en el formulario
3. **IDs consistentes**: Todos los registros deben hacer referencia al mismo ID de propiedad

## 5. Qué hacer si faltan datos

Si alguna tabla no muestra "Datos Encontrados":

1. Revise la consola del backend (terminal donde se ejecuta `npm run dev` para el backend)
2. Busque mensajes de error relacionados con la tabla específica
3. Verifique que la base de datos tenga las tablas necesarias (según el esquema en `schema.sql`)

## Solución de problemas comunes

### Error "null value in column 'person_id' violates not-null constraint"
- Asegúrese de estar autenticado al crear la propiedad
- La solución implementada usa un UUID placeholoder para usuarios de demostración

### No se muestran datos en algunas tablas
- Verifique que haya completado todos los campos relevantes en el formulario
- Los datos de hipoteca solo se guardan si se completan los campos de hipoteca
- Las métricas se calculan automáticamente a partir de otros valores

## Conclusión

Con la integración actualizada, el sistema ahora debería guardar correctamente todos los datos de propiedades en las tablas relacionadas. Esto permite un seguimiento completo de las propiedades, hipotecas, valoraciones y métricas financieras.

Si encuentra algún problema con la integración, por favor reporte el issue proporcionando:
1. El ID de la propiedad afectada
2. Capturas de pantalla de la herramienta de diagnóstico
3. Cualquier mensaje de error que aparezca en la consola