# Instrucciones para Implementar el Adaptador de Perfil

Este documento proporciona instrucciones detalladas para implementar el adaptador simplificado que resuelve los problemas de integración con la base de datos en OwnerIQ.

## Resumen del Problema

El sistema está intentando acceder a tablas inexistentes:
- Se busca `profiles` pero la base de datos sugiere `funding_profile`
- Se busca `addresses` pero la base de datos sugiere `person_address`

La solución implementada utiliza exclusivamente las tablas `person` (para perfiles) y `person_address` (para direcciones), siguiendo el flujo correcto de datos:
1. Al registrarse, el usuario se crea en `auth.users`
2. Luego se crea un registro en `person` con `kind='user'`
3. Al actualizar el perfil, se actualiza el registro en `person`
4. Las direcciones se guardan en `person_address`

## Pasos para la Implementación

### 1. Crear el Archivo de Servicio

1. Crea el directorio `src/services` si no existe:
   ```bash
   mkdir -p frontend/src/services
   ```

2. Crea el archivo `dataAdapter.js` en ese directorio copiando el contenido de `Codigo_ProfileAdapter_Simplificado.js`

3. Asegúrate de importar React useState:
   ```javascript
   import React, { useState } from 'react';
   ```

### 2. Modificar el Componente ProfileView

Abre el archivo `frontend/src/App.js` y localiza la función `ProfileView`. Modifícala para usar el adaptador:

```javascript
import { UserDataService, useProfileManager } from './services/dataAdapter';

function ProfileView() {
  const {
    profile,
    setProfile,
    addresses,
    setAddresses,
    isLoading,
    setIsLoading,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    fetchProfileData,
    handleProfileUpdate
  } = useProfileManager();
  
  // Estado para el formulario de dirección
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state_code: '',
    postal_code: '',
    is_primary: false
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        let result;
        
        if (editingAddressId) {
          // Actualizar dirección existente
          result = await UserDataService.updateUserAddress(
            editingAddressId,
            user.id,
            newAddress
          );
        } else {
          // Añadir nueva dirección
          result = await UserDataService.addUserAddress(user.id, newAddress);
        }
        
        const { error } = result;
        
        if (error) {
          console.error(editingAddressId ? 'Error updating address:' : 'Error adding address:', error);
          setErrorMessage(`Error ${editingAddressId ? 'updating' : 'adding'} address`);
        } else {
          setSuccessMessage(`Address ${editingAddressId ? 'updated' : 'added'} successfully`);
          setTimeout(() => setSuccessMessage(''), 3000);
          fetchProfileData();
          resetAddressForm();
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(`Error ${editingAddressId ? 'updating' : 'adding'} address`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { success, error } = await UserDataService.deleteUserAddress(addressId);
      
      if (error) {
        console.error('Error deleting address:', error);
        setErrorMessage('Error deleting address');
      } else {
        setSuccessMessage('Address deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchProfileData();
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error deleting address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const editAddress = (address) => {
    setNewAddress({
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      state_code: address.state_code || '',
      postal_code: address.postal_code || '',
      is_primary: address.is_primary || false
    });
    setEditingAddressId(address.address_id);
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setNewAddress({
      line1: '',
      line2: '',
      city: '',
      state_code: '',
      postal_code: '',
      is_primary: false
    });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  // El resto del componente permanece igual
  // ...
}
```

### 3. Modificar el Componente Onboarding

Asegúrate de que al registrar un usuario, se cree también el registro en `person`:

```javascript
import { UserDataService } from './services/dataAdapter';

function Onboarding({ setUser }) {
  // Código existente...

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Registrar usuario en auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Crear perfil en person
        await UserDataService.updateUserProfile(data.user.id, {
          full_name: fullName,
          primary_email: email,
          primary_phone: phone
        });
        
        setUser(data.user);
        setIsVerifying(true);
      }
    } catch (error) {
      console.error('Error signing up:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Resto del componente...
}
```

### 4. Modificar el Componente SettingsView

Actualiza SettingsView para usar el servicio al cargar los datos de perfil:

```javascript
import { UserDataService } from './services/dataAdapter';

function SettingsView({ setUser }) {
  // Código existente...

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await UserDataService.fetchUserProfile(user.id);
        setUserProfile(data);
      }
    }
    
    loadUserProfile();
  }, []);

  // Resto del componente...
}
```

## Verificación de la Implementación

Después de implementar los cambios, verifica:

1. **Registro de Usuario**:
   - Registra un nuevo usuario
   - Verifica en la base de datos que se crea registro en `auth.users`
   - Confirma que se crea registro en `person` con `kind='user'`

2. **Actualización de Perfil**:
   - Inicia sesión y ve a Configuración > Perfil de Usuario
   - Actualiza información personal y guarda
   - Verifica que se actualiza el registro en `person`
   - Confirma que no hay errores en la consola

3. **Gestión de Direcciones**:
   - Añade una nueva dirección
   - Edita una dirección existente 
   - Elimina una dirección
   - Verifica que los cambios se reflejan en `person_address`

## Depuración

Si encuentras problemas:

1. **Verifica logs en la consola del navegador**:
   - El adaptador incluye logs detallados de cada operación

2. **Consulta directamente las tablas**:
   ```sql
   SELECT * FROM auth.users WHERE email = 'usuario@ejemplo.com';
   SELECT * FROM person WHERE user_id = 'id-del-usuario';
   SELECT * FROM person_address WHERE person_id = 'id-del-usuario';
   ```

3. **Revisa el flujo de datos**:
   - ¿Se está creando correctamente el usuario en auth?
   - ¿Se está creando/actualizando el registro en person?
   - ¿Se están gestionando correctamente las direcciones?

## Extensión a Otras Áreas

Esta solución puede extenderse a otras partes de la aplicación que interactúan con estas tablas, siguiendo el mismo patrón:

1. Importar `UserDataService` donde sea necesario
2. Reemplazar consultas directas a `profiles`/`addresses` con los métodos del servicio
3. Asegurarse de que se estén pasando los parámetros correctos