# 📝 Guía de Integración de Event Logging Completo

## ✅ Lo que YA está funcionando (Backend)

El backend ya registra automáticamente:

- ✅ **Profile Created** - Cuando se crea un profile nuevo
- ✅ **Profile Updated** - Cuando se actualiza el profile
- ✅ **Batch Created** - Cuando se crea un batch de documentos
- ✅ **Storage Upload** - Cuando se sube un archivo a Storage
- ✅ **Document Uploaded** - Cuando se guarda en database
- ✅ **Document Processing** - Inicio, éxito y fallo de AI
- ✅ **Errores** - Todos los errores del flujo

## 🔧 Lo que necesitas integrar (Frontend)

Para tener logging COMPLETO del ciclo de vida del usuario, necesitas agregar logging en el frontend para:

### 1. **Login** (App.js)

```javascript
// En App.js, después de un login exitoso:
import EventLogger from './utils/EventLogger';

// Cuando el usuario hace login
const handleLogin = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) {
    await EventLogger.logLogin(email);
  }
};
```

### 2. **Logout** (App.js)

```javascript
// Cuando el usuario hace logout
const handleLogout = async () => {
  await EventLogger.logLogout();
  await supabase.auth.signOut();
};
```

### 3. **Signup** (LoginScreen.js o donde manejes el signup)

```javascript
// Después de crear la cuenta
const handleSignup = async (email, password) => {
  const { error } = await supabase.auth.signUp({ email, password });
  if (!error) {
    // El backend automáticamente registrará 'profile_created'
    // Pero puedes agregar esto también:
    await EventLogger.logSignup(email);
  }
};
```

### 4. **Pasos del Onboarding** (ComprehensiveOnboarding.js)

Agrega esto en la función `handleNext`:

```javascript
import EventLogger from '../../utils/EventLogger';

const handleNext = async () => {
  // ... código existente ...

  // Log del paso completado
  await EventLogger.logStepCompleted(currentStep, {
    step_name: getStepName(currentStep),
    timestamp: new Date().toISOString()
  });

  // Si es el primer paso, log onboarding started
  if (currentStep === 1) {
    await EventLogger.logOnboardingStarted();
  }

  // Si es el último paso, log onboarding completed
  if (currentStep === 4) {
    await EventLogger.logOnboardingCompleted();
  }

  setCurrentStep(currentStep + 1);
};

// Helper para nombres de pasos
const getStepName = (step) => {
  const names = {
    1: 'Personal Information',
    2: 'Property Details',
    3: 'Document Upload',
    4: 'Review & Submit'
  };
  return names[step] || `Step ${step}`;
};
```

### 5. **Integración Completa en ComprehensiveOnboarding.js**

Aquí está el código completo para agregar al inicio de `ComprehensiveOnboarding.js`:

```javascript
// Al inicio del archivo, después de los imports existentes
import EventLogger from '../../utils/EventLogger';

// Dentro del componente, agregar useEffect para detectar inicio
useEffect(() => {
  if (currentStep === 1) {
    EventLogger.logOnboardingStarted();
  }
}, []); // Solo una vez al montar

// Modificar handleNext
const handleNext = async () => {
  // Validaciones existentes...
  
  if (currentStep === 1) {
    // ... validaciones Step 1 ...
    
    // Log paso 1 completado
    await EventLogger.logStepCompleted(1, {
      user_type: userType,
      has_primary_residence: hasPrimaryResidence
    });
    
    setCurrentStep(2);
  } else if (currentStep === 2) {
    // ... validaciones Step 2 ...
    
    // Log paso 2 completado
    await EventLogger.logStepCompleted(2, {
      property_type: propertyType,
      address_entered: !!address
    });
    
    setCurrentStep(3);
  } else if (currentStep === 3) {
    // ... validaciones Step 3 ...
    
    // Log paso 3 completado
    await EventLogger.logStepCompleted(3, {
      documents_uploaded: documents.filter(d => d.status === 'received').length
    });
    
    setCurrentStep(4);
  } else if (currentStep === 4) {
    // ... submit final ...
    
    // Log onboarding completado
    await EventLogger.logOnboardingCompleted();
    
    navigate('/dashboard');
  }
};
```

## 📊 Eventos que se Registrarán

Después de la integración, el timeline completo será:

```
Usuario: test@example.com
ID: abc123...

[2025-12-21 10:00:00] user_signup ← Signup
[2025-12-21 10:00:01] profile_created ← Backend automático
[2025-12-21 10:00:05] email_confirmed ← Cuando confirme email
[2025-12-21 10:00:10] user_login ← Primer login
[2025-12-21 10:01:00] onboarding_started ← Inicia onboarding
[2025-12-21 10:02:00] step_completed (1) ← Completa paso 1
[2025-12-21 10:02:01] profile_updated ← Backend automático
[2025-12-21 10:03:00] step_completed (2) ← Completa paso 2
[2025-12-21 10:03:01] profile_updated ← Backend automático
[2025-12-21 10:04:00] batch_created ← Backend automático
[2025-12-21 10:04:05] storage_upload_success ← Backend automático
[2025-12-21 10:04:06] document_uploaded ← Backend automático
[2025-12-21 10:04:07] document_processing_started ← Backend automático
[2025-12-21 10:04:15] document_processed ← Backend automático
[2025-12-21 10:05:00] step_completed (3) ← Completa paso 3
[2025-12-21 10:06:00] step_completed (4) ← Completa paso 4
[2025-12-21 10:06:01] onboarding_completed ← Finaliza onboarding
```

## 🎯 Resumen de Integración

### Archivos a modificar:

1. **`frontend/src/App.js`**
   - Importar `EventLogger`
   - Agregar `EventLogger.logLogin()` después de login
   - Agregar `EventLogger.logLogout()` antes de logout

2. **`frontend/src/components/Auth/LoginScreen.js`** (o donde hagas signup)
   - Importar `EventLogger`
   - Agregar `EventLogger.logSignup()` después del signup

3. **`frontend/src/components/Auth/ComprehensiveOnboarding.js`**
   - Importar `EventLogger`
   - Agregar `EventLogger.logOnboardingStarted()` en useEffect inicial
   - Agregar `EventLogger.logStepCompleted()` en cada paso del `handleNext`
   - Agregar `EventLogger.logOnboardingCompleted()` al finalizar

### Código ya creado y listo:

- ✅ `backend/utils/OnboardingEventLogger.js` - Métodos de logging expandidos
- ✅ `backend/routes/events.js` - API endpoint para frontend
- ✅ `frontend/src/utils/EventLogger.js` - Helper para frontend
- ✅ Backend server actualizado con ruta `/api/events`

## 🚀 Para Probar

1. Reinicia el backend (ya hecho)
2. Agrega los imports y llamadas a `EventLogger` en el frontend
3. Crea una cuenta nueva de prueba
4. Completa el onboarding
5. Ve a **Event Logs** en la app y verás TODO el timeline

## 💡 Ejemplo Rápido de Integración

Si quieres empezar simple, agrega esto SOLO en `ComprehensiveOnboarding.js`:

```javascript
// Después de los imports existentes
import EventLogger from '../../utils/EventLogger';

// Al final de handleNext, antes de cambiar de paso
const handleNext = async () => {
  // ... todo tu código existente ...
  
  // SOLO AGREGAR ESTAS LÍNEAS:
  if (currentStep === 1) {
    await EventLogger.logStepCompleted(1);
    setCurrentStep(2);
  } else if (currentStep === 2) {
    await EventLogger.logStepCompleted(2);
    setCurrentStep(3);
  } else if (currentStep === 3) {
    await EventLogger.logStepCompleted(3);
    setCurrentStep(4);
  } else if (currentStep === 4) {
    await EventLogger.logOnboardingCompleted();
    // navigate o lo que hagas al final
  }
};
```

Eso es todo! Con eso ya tendrás logging de cada paso del onboarding.

## 📞 Soporte

Si tienes dudas o problemas con la integración, el helper `EventLogger` maneja errores internamente (console.warn) para que nunca rompa el flujo del usuario.

Los eventos del backend (profile, uploads, etc.) YA están funcionando automáticamente.
