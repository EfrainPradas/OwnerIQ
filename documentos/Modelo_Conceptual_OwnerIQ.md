# Modelo Conceptual de OwnerIQ

Este documento presenta un modelo conceptual simplificado de la aplicación OwnerIQ, explicando las principales entidades y sus relaciones desde una perspectiva de negocio.

## Entidades Principales

### 1. Usuario
Representa a un usuario registrado del sistema OwnerIQ. Cada usuario:
- Tiene información de autenticación (email, contraseña)
- Tiene un perfil personal con datos de contacto
- Puede gestionar múltiples direcciones
- Es propietario de cero o más propiedades inmobiliarias

### 2. Propiedad
Representa un inmueble gestionado en la plataforma. Cada propiedad:
- Pertenece a un único propietario (usuario)
- Tiene características físicas (tamaño, año de construcción)
- Tiene una valoración económica
- Puede tener una hipoteca asociada
- Puede estar alquilada a un inquilino
- Tiene una dirección física asociada
- Genera ingresos (alquiler) y gastos (impuestos, seguros, etc.)

### 3. Hipoteca
Representa el financiamiento de una propiedad. Cada hipoteca:
- Está asociada a una única propiedad
- Contiene términos financieros (monto, tasa de interés, plazo)
- Registra pagos mensuales y otros detalles financieros

### 4. Inquilino
Representa a una persona que alquila una propiedad. Cada inquilino:
- Está asociado a una única propiedad
- Tiene datos personales y de contacto
- Tiene un contrato de arrendamiento con fechas de inicio/fin
- Paga una renta mensual específica

### 5. Persona
Representa a individuos o entidades externas relacionadas con el negocio inmobiliario:
- **Prestatarios**: Personas que obtienen préstamos para propiedades
- **Prestamistas**: Bancos o instituciones financieras que otorgan hipotecas

### 6. Dirección
Representa una ubicación física que puede estar asociada a:
- Usuarios (direcciones personales)
- Propiedades (ubicación del inmueble)
- Prestatarios o prestamistas (direcciones de contacto)

## Flujos de Negocio Principales

### 1. Gestión de Propiedades
- Un usuario registra sus propiedades en el sistema
- Para cada propiedad, registra detalles físicos y financieros
- Opcionalmente, registra hipotecas asociadas a las propiedades
- Opcionalmente, registra inquilinos que ocupan las propiedades

### 2. Análisis Financiero
- El sistema calcula métricas importantes como:
  - Valor total del portafolio
  - Ingresos mensuales/anuales por alquiler
  - Gastos asociados (impuestos, seguros, HOA)
  - Flujo de caja generado por las propiedades

### 3. Gestión de Contactos
- El usuario puede gestionar contactos relacionados con su negocio:
  - Prestatarios que reciben financiamiento
  - Prestamistas que otorgan hipotecas
  - Inquilinos que ocupan sus propiedades

### 4. Monitoreo de Rendimiento
- El dashboard proporciona visualizaciones del rendimiento de las propiedades
- Se pueden generar reportes para análisis detallado
- Se puede hacer seguimiento de la evolución del valor del portafolio

## Ventajas del Modelo

1. **Centralización**: Toda la información relevante del negocio inmobiliario está en un solo lugar
2. **Relaciones claras**: El modelo captura las relaciones entre propiedades, personas y financiamiento
3. **Flexibilidad**: El diseño permite registrar diferentes tipos de propiedades y relaciones
4. **Análisis financiero**: Facilita el cálculo de métricas financieras clave
5. **Escalabilidad**: El modelo puede crecer para incluir nuevos tipos de entidades o relaciones

Este modelo conceptual proporciona una visión de alto nivel de cómo OwnerIQ organiza y relaciona la información para ayudar a los propietarios a gestionar eficientemente su negocio inmobiliario.