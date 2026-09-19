import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, updatePassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { validarContrasena } from '../../utils/validacion'

export default function Configuracion() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardarContrasena(e) {
    e.preventDefault()
    setMensaje('')
    const errorContrasena = validarContrasena(nuevaContrasena)
    if (errorContrasena) {
      setMensaje(errorContrasena)
      return
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setMensaje('Las contraseñas no coinciden.')
      return
    }
    setGuardando(true)
    try {
      await updatePassword(auth.currentUser, nuevaContrasena)
      setMensaje('Contraseña actualizada.')
      setNuevaContrasena('')
      setConfirmarContrasena('')
    } catch (err) {
      setMensaje(
        err.code === 'auth/requires-recent-login'
          ? 'Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la contraseña.'
          : 'No se pudo actualizar la contraseña.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div>
      <h1 className="web-h1">Mi cuenta</h1>
      <div className="web-2col" style={{ maxWidth: 820 }}>
        <form className="card-plain" onSubmit={guardarContrasena}>
          <h2 className="section-title">Contraseña</h2>
          <label className="campo-label">Correo</label>
          <input type="text" value={usuario?.email ?? ''} readOnly style={{ opacity: 0.7 }} />
          <label className="campo-label" htmlFor="nueva">Nueva contraseña</label>
          <input id="nueva" type="password" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} />
          <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>Mínimo 8 caracteres, con letras y números.</div>
          <label className="campo-label" htmlFor="confirmar">Confirmar contraseña</label>
          <input id="confirmar" type="password" value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)} />
          {mensaje && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--alerta)' }}>{mensaje}</div>}
          <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardando}>Guardar cambios</button>
        </form>

        <div>
          <div className="card-plain">
            <h2 className="section-title">Notificaciones</h2>
            <div className="admin-row"><div style={{ fontSize: 12 }}>Nuevas solicitudes</div><div className="switch on" onClick={(e) => e.currentTarget.classList.toggle('on')}></div></div>
            <div className="admin-row" style={{ borderBottom: 'none' }}><div style={{ fontSize: 12 }}>Nuevas denuncias</div><div className="switch on" onClick={(e) => e.currentTarget.classList.toggle('on')}></div></div>
          </div>
          <button type="button" className="btn btn-danger btn-auto" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}
