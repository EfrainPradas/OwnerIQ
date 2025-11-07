# Resumen Ejecutivo: Modelo de Datos OwnerIQ

## Visión General

El modelo de datos de OwnerIQ está diseñado para gestionar de manera eficiente propiedades inmobiliarias, sus propietarios, inquilinos, préstamos y métricas financieras asociadas. La arquitectura de datos permite un seguimiento detallado de las operaciones inmobiliarias y facilita el análisis financiero de las inversiones.

## Entidades Clave

### 1. Personas
**Función**: Almacena información sobre todos los actores del sistema.
- Utiliza un **discriminador** (`kind`) para diferenciar usuarios, propietarios, prestamistas, etc.
- Permite que una misma persona pueda desempeñar varios roles simultáneamente.
- Almacena información básica de contacto.

### 2. Propiedades
**Función**: Registra los activos inmobiliarios y sus características.
- Vinculada a su propietario (persona).
- Contiene datos básicos (dirección, tipo) y financieros (valoración, renta).
- Se complementa con tablas auxiliares para métricas y análisis detallados.

### 3. Préstamos
**Función**: Gestiona la información financiera de hipotecas y préstamos.
- Asociados a propiedades específicas.
- Registra condiciones (tasas, plazos) y montos.
- Permite análisis de flujo de caja y retorno de inversión.

### 4. Direcciones
**Función**: Maneja las ubicaciones físicas de personas.
- Una persona puede tener múltiples direcciones con diferentes propósitos.
- Estructura estandarizada para facilitar búsquedas geográficas.

## Relaciones Fundamentales

![Diagrama de Relaciones Básicas](https://mermaid.ink/img/pako:eNptkU1qwzAQha8itA4UbCd2frpsG8ilujDImiSpLCEkG5qQs_cetWkhu9GMvu89zZOemDGOiRrDu_5UHVFfvCG8WdptQWsdcpAHVFjFh53zJOHFeDL4rtFlMu0OsLCGX6WIxXL71WrbjcI_VYfscjPJpV2UrWRiZeUq2xT5upBcZSrPuSqkSoVKi1LKIsqbKQaKMvg5Rg9ZP41yjFGOEvw5LPJmitO_z9J8N4ZoPvixiZhc1OTbxoYyYIH75c4jXbHraDlI-D5F5ZHMl2W6QO_wmgmOxvcl3oO9YiKPcnH06YotTy-KkfYfdCfTMQ?type=png)

## Ventajas del Diseño

1. **Flexibilidad**: El uso de discriminadores permite adaptar el sistema a diferentes tipos de usuarios y roles.

2. **Separación de Preocupaciones**: Las métricas y análisis financieros se separan de los datos básicos, permitiendo actualizaciones independientes.

3. **Historial y Seguimiento**: Las tablas de métricas incluyen campos de fecha para seguimiento histórico.

4. **Extensibilidad**: Facilidad para añadir nuevas entidades o características sin alterar la estructura existente.

## Métricas y Análisis

El sistema almacena y calcula diversas métricas financieras:

- **Cap Rate**: Tasa de capitalización para evaluar rendimiento
- **Cash on Cash Return**: Retorno del efectivo invertido
- **DSCR**: Ratio de cobertura del servicio de la deuda
- **Flujo de Caja Neto**: Ingresos menos gastos operativos y servicio de deuda
- **Valoración**: Historial de valuaciones de propiedades

## Conclusión

El modelo de datos proporciona una base sólida para la gestión integral de propiedades inmobiliarias, desde aspectos básicos como propietarios e inquilinos hasta análisis financieros detallados para la toma de decisiones de inversión.

La estructura permite flexibilidad para adaptarse a diferentes casos de uso mientras mantiene la integridad referencial y facilita consultas eficientes para la generación de informes y análisis.