import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { validarContrasena } from '../utils/validacion'

function mensajeDeError(err) {
  switch (err?.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'La contraseña actual no es correcta.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.'
    case 'auth/network-request-failed':
      return 'No hay conexión. Revisa tu internet e intenta de nuevo.'
    case 'auth/requires-recent-login':
      return 'Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la contraseña.'
    default:
      return 'No se pudo actualizar la contraseña.'
  }
}

// Cambio de contraseña para cualquier cuenta (paciente, doctor o admin): primero pide la contraseña
// actual y la verifica con Firebase; solo si es correcta se guarda la nueva.
export default function CambiarContrasena({ mostrarCorreo = false, textoBoton = 'Guardar contraseña' }) {
  const { usuario } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setMensaje(null)

    if (!actual) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu contraseña actual.' })
      return
    }
    const errorContrasena = validarContrasena(nueva)
    if (errorContrasena) {
      setMensaje({ tipo: 'error', texto: errorContrasena })
      return
    }
    if (nueva === actual) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe ser distinta de la actual.' })
      return
    }
    if (nueva !== confirmar) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }

    setGuardando(true)
    try {
      const cuenta = auth.currentUser
      await reauthenticateWithCredential(cuenta, EmailAuthProvider.credential(cuenta.email, actual))
      await updatePassword(cuenta, nueva)
      setMensaje({ tipo: 'ok', texto: 'Contraseña actualizada.' })
      setActual('')
      setNueva('')
      setConfirmar('')
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="card-plain" onSubmit={guardar}>
      <h2 className="section-title">Contraseña</h2>
      {mostrarCorreo && (
        <>
          <label className="campo-label">Correo</label>
          <input type="text" value={usuario?.email ?? ''} readOnly style={{ opacity: 0.7 }} />
        </>
      )}
      <label className="campo-label" htmlFor="contrasena-actual">Contraseña actual</label>
      <input
        id="contrasena-actual"
        type="password"
        autoComplete="current-password"
        placeholder="Tu contraseña de ahora"
        value={actual}
        onChange={(e) => setActual(e.target.value)}
      />
      <label className="campo-label" htmlFor="contrasena-nueva">Nueva contraseña</label>
      <input id="contrasena-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>Mínimo 8 caracteres, con letras y números.</div>
      <label className="campo-label" htmlFor="contrasena-confirmar">Confirmar nueva contraseña</label>
      <input
        id="contrasena-confirmar"
        type="password"
        autoComplete="new-password"
        placeholder="Repita la contraseña"
        value={confirmar}
        onChange={(e) => setConfirmar(e.target.value)}
      />
      {mensaje && (
        <div role="status" style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>
          {mensaje.texto}
        </div>
      )}
      <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardando}>
        {guardando ? 'Guardando…' : textoBoton}
      </button>
    </form>
  )
}
