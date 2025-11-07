# Implementación de Botón Logout en Panel de Settings

Según el feedback recibido, es necesario agregar un botón de cierre de sesión (Logout) en el panel de configuración (Settings) para facilitar el reinicio de la sesión del usuario.

## Cambios Requeridos

Se modificará el componente `SettingsView` en el archivo `App.js` para incluir un botón de logout en dos ubicaciones estratégicas:

1. En el panel lateral de navegación (siempre visible)
2. En la sección de seguridad (Security tab)

## Código a Implementar

### 1. Modificación del Panel Lateral

```jsx
// En el componente SettingsView, modificar el panel lateral agregando un separador y botón de logout
<div style={{
  width: '250px',
  marginRight: '30px',
  background: 'var(--panel-secondary)',
  borderRadius: 'var(--border-radius)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}}>
  {/* Mantener el código existente de las pestañas */}
  {[
    { id: 'profile', label: 'User Profile', icon: 'user' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'security', label: 'Security', icon: 'shield-alt' },
    { id: 'language', label: 'Language', icon: 'language' }
  ].map(tab => (
    <div
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      style={{
        padding: '15px 20px',
        borderLeft: activeTab === tab.id ? '4px solid var(--accent-primary)' : '4px solid transparent',
        background: activeTab === tab.id ? 'var(--panel-primary)' : 'transparent',
        color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-primary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s ease'
      }}
    >
      <i className={`fas fa-${tab.icon}`} style={{ width: '20px', textAlign: 'center' }}></i>
      <span style={{ fontWeight: activeTab === tab.id ? '600' : '400' }}>{tab.label}</span>
    </div>
  ))}

  {/* Agregar separador */}
  <div style={{
    margin: '15px 20px',
    borderTop: '1px solid var(--border)',
    flex: 1
  }}></div>

  {/* Botón de logout */}
  <div
    onClick={async () => {
      if (window.confirm('Are you sure you want to log out?')) {
        const { error } = await supabase.auth.signOut();
        if (!error) {
          // Restablecer el estado de la aplicación
          setUser(null);
          setCurrentView('dashboard');
        } else {
          console.error('Error signing out:', error);
        }
      }
    }}
    style={{
      padding: '15px 20px',
      background: 'transparent',
      color: 'var(--error)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: 'all 0.2s ease',
      marginBottom: '15px'
    }}
  >
    <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i>
    <span style={{ fontWeight: '600' }}>Logout</span>
  </div>
</div>
```

### 2. Agregar Botón en la Sección de Seguridad

```jsx
{/* En el componente SettingsView, en la sección de activeTab === 'security', agregar: */}
{activeTab === 'security' && (
  <div className="card" style={{ padding: '25px' }}>
    <div style={{
      borderBottom: '1px solid var(--border)',
      paddingBottom: '15px',
      marginBottom: '25px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <i className="fas fa-shield-alt" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}></i>
      <h2 style={{ margin: 0, fontSize: '20px' }}>Security Settings</h2>
    </div>

    {/* Código existente de configuración de seguridad */}
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: 'var(--text-secondary)'
      }}>
        Session Timeout (minutes)
      </label>
      <input
        type="number"
        value={settings.sessionTimeout}
        onChange={e => handleSettingsChange('sessionTimeout', parseInt(e.target.value))}
        min="5"
        max="120"
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border)',
          background: 'var(--panel-secondary)',
          color: 'var(--text-primary)',
          fontSize: '16px',
          marginBottom: '5px'
        }}
      />
      <small style={{ color: 'var(--text-muted)' }}>
        Automatically log out after this period of inactivity
      </small>
    </div>

    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
      {/* Botón existente de cambio de contraseña */}
      <button
        style={{
          padding: '14px 24px',
          background: 'var(--panel-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--border-radius)',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <i className="fas fa-key"></i> Change Password
      </button>

      {/* Nuevo botón de logout */}
      <button
        onClick={async () => {
          if (window.confirm('Are you sure you want to log out?')) {
            const { error } = await supabase.auth.signOut();
            if (!error) {
              // Restablecer el estado de la aplicación
              setUser(null);
              setCurrentView('dashboard');
            } else {
              console.error('Error signing out:', error);
            }
          }
        }}
        style={{
          padding: '14px 24px',
          background: 'var(--error)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--border-radius)',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <i className="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>
  </div>
)}
```

## Acceso a las Funciones Necesarias

Para que estos botones funcionen correctamente, es necesario que el componente `SettingsView` tenga acceso a:

1. La función `setUser` para establecer el estado de usuario a `null`
2. La función `setCurrentView` para redirigir a la vista de dashboard
3. El cliente `supabase` para llamar a `auth.signOut()`

Dado que las funciones `setUser` y `setCurrentView` están disponibles en el componente `App`, pero no se están pasando al componente `SettingsView`, debemos modificar cómo se llama a este componente:

```jsx
{/* En App.js, en la función renderContent */}
else if (currentView === 'settings') {
  return <SettingsView setUser={setUser} setCurrentView={setCurrentView} />;
}
```

Luego, actualizar la declaración del componente `SettingsView`:

```jsx
function SettingsView({ setUser, setCurrentView }) {
  const [activeTab, setActiveTab] = useState('profile');
  // Resto del código...
}
```

## Implementación Alternativa

Si pasar los props a través de la jerarquía de componentes resulta complicado, se puede crear una función de logout en el componente `App` y pasarla a `SettingsView`:

```jsx
// En App.js
const handleLogout = async () => {
  if (window.confirm('Are you sure you want to log out?')) {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setCurrentView('dashboard');
    } else {
      console.error('Error signing out:', error);
    }
  }
};

// En renderContent
else if (currentView === 'settings') {
  return <SettingsView handleLogout={handleLogout} />;
}

// En SettingsView
function SettingsView({ handleLogout }) {
  // Usar handleLogout en los botones en lugar del código completo
}
```

## Resultado Final

Con estos cambios, el panel de Settings tendrá:

1. Un botón de logout siempre visible al final del panel lateral de navegación
2. Un botón de logout adicional en la sección de seguridad junto al botón de cambio de contraseña

Ambos botones mostrarán una confirmación antes de cerrar la sesión, y al confirmar, se cerrará la sesión del usuario, se establecerá el estado del usuario a `null` y se redirigirá a la vista de dashboard.

## Consideraciones de Seguridad

- Se muestra un diálogo de confirmación para evitar cierres de sesión accidentales
- Se maneja el posible error al cerrar sesión
- Se restablece el estado de la aplicación apropiadamente para evitar acceso a datos después del cierre de sesión