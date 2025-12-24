# OwnerIQ Admin Console

Consola de administración separada para OwnerIQ - Gestión de usuarios, batches, y monitoreo de eventos.

## 🚀 Inicio Rápido

```bash
cd admin-console
npm install
npm start
```

La app correrá en: **http://localhost:3003**

## 📋 Funcionalidades

### 1. **Dashboard** 📊
- Gestión de usuarios registrados
- Visualización de batches y documentos
- Control de procesamiento de documentos
- Filtros por status (PENDING, PROCESSING, COMPLETED, FAILED)

### 2. **Process Logs** 📋
- Timeline de eventos de procesamiento de documentos
- Visualización detallada por batch
- Metadata expandible
- Estados codificados por colores

### 3. **Onboarding Logs** 📊
- Logs del proceso de onboarding de usuarios
- Timeline de eventos (profile_created, step_completed, etc.)
- Filtros y búsqueda

### 4. **Event Logs** 📋
- Vista unificada de eventos de onboarding
- Analytics y estadísticas
- Filtros por categoría y tipo de evento

## 🔧 Configuración

### Variables de Entorno
Archivo `.env`:
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_SUPABASE_URL=tu_supabase_url
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key
```

## 🏗️ Arquitectura

```
admin-console/
├── src/
│   ├── components/
│   │   ├── Admin/              # Dashboard principal
│   │   │   ├── AdminDashboard.js
│   │   │   ├── AdminProcessLogs.js
│   │   │   ├── OnboardingEventLogs.js
│   │   │   └── MatrixBinaryRain.js
│   │   └── EventLogView/       # Vista de event logs
│   ├── App.js                  # App principal con routing
│   └── supabaseClient.js       # Cliente de Supabase
└── .env                        # Variables de entorno
```

## 🔒 Seguridad

- **Autenticación**: Requiere login con credenciales admin
- **Separación**: Código completamente separado del cliente
- **API**: Usa rutas `/api/admin` protegidas en el backend

## 🌐 Deployment

### Desarrollo
- Admin Console: `http://localhost:3003`
- Cliente: `http://localhost:3002`
- Backend: `http://localhost:5001`

### Producción
Recomendado usar subdominio:
- Admin Console: `https://admin.owneriq.com`
- Cliente: `https://owneriq.com`

## 📦 Build para Producción

```bash
npm run build
```

Output en `build/` - deploy a servidor o servicio de hosting estático.

## 🔗 Backend Compartido

El Admin Console comparte el backend con la app cliente:
- Rutas admin: `/api/admin/*`
- Rutas eventos: `/api/events/*`
- Autenticación: Supabase Auth

## 🎨 UI/UX

- **Timeline minimalista** con gradient purple-pink
- **Cards limpios** con información estructurada
- **Responsive** y optimizado para desktop
- **Tema oscuro** para reducir fatiga visual

---

**Desarrollado para OwnerIQ** 🏠
