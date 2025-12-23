# 🔐 Cómo Proteger la Consola de Admin

## ⚠️ Estado Actual

**La consola de admin está visible para cualquier usuario autenticado.**

Por ahora está bien porque solo tú la usas, pero para producción necesita protección.

---

## 🛡️ Opción 1: Por Email (Más Simple)

### 1. Agrega lista de admins en `.env`

```env
# backend/.env
ADMIN_EMAILS=efrain.pradas@gmail.com,otro-admin@example.com
```

### 2. Crea middleware de autenticación

```javascript
// backend/middleware/adminAuth.js
const checkAdminAccess = async (req, res, next) => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  const userEmail = req.user?.email;

  if (!adminEmails.includes(userEmail)) {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  next();
};

module.exports = { checkAdminAccess };
```

### 3. Protege ruta admin en backend

```javascript
// backend/server.js
const { checkAdminAccess } = require('./middleware/adminAuth');

app.use('/api/admin', authenticateToken, checkAdminAccess, require('./routes/admin'));
```

### 4. Protege ruta admin en frontend

```javascript
// frontend/src/views/AdminView.js
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useEffect, useState } from 'react';

const AdminView = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const adminEmails = [
      'efrain.pradas@gmail.com',
      'otro-admin@example.com'
    ];

    if (!user || !adminEmails.includes(user.email)) {
      alert('⛔ Acceso denegado. Solo administradores.');
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return null;

  // ... resto del componente
};
```

---

## 🛡️ Opción 2: Campo `is_admin` en Base de Datos (Más Robusto)

### 1. Agrega columna `is_admin` a `user_profiles`

```sql
-- En Supabase SQL Editor
ALTER TABLE user_profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Marca tu usuario como admin
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE owner_email = 'efrain.pradas@gmail.com';
```

### 2. Middleware backend

```javascript
// backend/middleware/adminAuth.js
const { createClient } = require('@supabase/supabase-js');

const checkAdminAccess = async (req, res, next) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const userId = req.user.id;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .single();

  if (!profile?.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  next();
};

module.exports = { checkAdminAccess };
```

### 3. Frontend check

```javascript
// frontend/src/views/AdminView.js
const checkAdminAccess = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    navigate('/dashboard');
    return;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    alert('⛔ Acceso denegado. Solo administradores.');
    navigate('/dashboard');
    return;
  }

  setIsAdmin(true);
  setLoading(false);
};
```

---

## 🎨 Opción 3: Ocultar Botón Admin (UI)

### Esconder el botón Admin del nav

```javascript
// En App.js, donde está el botón Admin
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  checkIfAdmin();
}, [user]);

const checkIfAdmin = async () => {
  if (!user) return;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  setIsAdmin(profile?.is_admin || false);
};

// En el render del botón Admin:
{isAdmin && (
  <button
    onClick={() => navigate('/admin')}
    style={{...}}
  >
    🔐 Admin
  </button>
)}
```

---

## ✅ Recomendación

Para **producción**, usa **Opción 2** (campo `is_admin` en DB) + **Opción 3** (ocultar botón).

Esto te da:
- ✅ Protección en backend (obligatorio)
- ✅ Protección en frontend (seguridad)
- ✅ UI limpia (UX)
- ✅ Fácil de gestionar admins

---

## 📝 Pasos Rápidos para Implementar

Cuando quieras proteger la consola:

1. **SQL**: Agregar columna `is_admin` a `user_profiles`
2. **SQL**: `UPDATE user_profiles SET is_admin = TRUE WHERE owner_email = 'tu@email.com'`
3. **Backend**: Copiar código de middleware `checkAdminAccess`
4. **Backend**: Proteger ruta en `server.js`
5. **Frontend**: Agregar check en `AdminView.js`
6. **Frontend**: Ocultar botón Admin en `App.js`

---

## 🚨 No Olvides

- La URL `/admin` seguirá siendo accesible si solo ocultas el botón
- **SIEMPRE** valida en el backend
- Frontend es solo UX, no seguridad
- En producción, considera también rate limiting

---

**Documentado el:** 2025-12-21  
**Estado:** Admin abierto para testing  
**Próximo paso:** Implementar protección antes de producción
