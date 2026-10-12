import { useState } from 'react'

// Input de contraseña con botón de "ojito" para mostrar/ocultar el texto. Acepta las mismas props
// que un <input> normal (id, value, onChange, placeholder, autoComplete, required, etc.).
export default function CampoContrasena({ style, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', ...style }}>
      <input {...props} type={visible ? 'text' : 'password'} style={{ paddingRight: 40 }} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 15,
          padding: 4,
          lineHeight: 1,
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
