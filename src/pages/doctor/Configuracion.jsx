import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut, updatePassword } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { validarContrasena } from '../../utils/validacion'

export default function Configuracion() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [telefono, setTelefono] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [mensajeDatos, setMensajeDatos] = useState('')
  const [mensajeContrasena, setMensajeContrasena] = useState('')
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [guardandoContrasena, setGuardandoContrasena] = useState(false)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid)).then((snap) => {
      if (snap.exists()) setTelefono(snap.data().telefono ?? '')
    })
  }, [usuario])

  async function guardarDatos(e) {
    e.preventDefault()
    setMensajeDatos('')
    setGuardandoDatos(true)
    try {
      await updateDoc(doc(db, 'usuarios', usuario.uid), { telefono })
      setMensajeDatos('Datos actualizados.')
    } catch {
      setMensajeDatos('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardandoDatos(false)
    }
  }

  async function guardarContrasena(e) {
    e.preventDefault()
    setMensajeContrasena('')
    const errorContrasena = validarContrasena(nuevaContrasena)
    if (errorContrasena) {
      setMensajeContrasena(errorContrasena)
      return
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setMensajeContrasena('Las contraseñas no coinciden.')
      return
    }
    setGuardandoContrasena(true)
    try {
      await updatePassword(auth.currentUser, nuevaContrasena)
      setMensajeContrasena('Contraseña actualizada.')
      setNuevaContrasena('')
      setConfirmarContrasena('')
    } catch (err) {
      setMensajeContrasena(
        err.code === 'auth/requires-recent-login'
          ? 'Por seguridad, cierra sesión y vuelve a entrar antes de cambiar la contraseña.'
          : 'No se pudo actualizar la contraseña.'
      )
    } finally {
      setGuardandoContrasena(false)
    }
  }

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div>
      <h1 className="web-h1">Configuración de cuenta</h1>
      <div className="web-2col" style={{ maxWidth: 820 }}>
        <div>
          <form className="card-plain" onSubmit={guardarContrasena}>
            <h2 className="section-title">Contraseña</h2>
            <label className="campo-label" htmlFor="nueva">Nueva contraseña</label>
            <input id="nueva" type="password" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} />
            <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>Mínimo 8 caracteres, con letras y números.</div>
            <label className="campo-label" htmlFor="confirmar">Confirmar nueva contraseña</label>
            <input id="confirmar" type="password" value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)} />
            {mensajeContrasena && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--alerta)' }}>{mensajeContrasena}</div>}
            <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardandoContrasena}>Guardar contraseña</button>
          </form>

          <form className="card-plain" onSubmit={guardarDatos}>
            <h2 className="section-title">Datos de contacto</h2>
            <label className="campo-label" htmlFor="telefono">Celular</label>
            <input id="telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            {mensajeDatos && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--esmeralda)' }}>{mensajeDatos}</div>}
            <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardandoDatos}>Guardar</button>
          </form>
        </div>

        <div>
          <div className="card-plain">
            <h2 className="section-title">Notificaciones</h2>
            <div className="admin-row"><div style={{ fontSize: 12 }}>Mensajes de pacientes</div><div className="switch on" onClick={(e) => e.currentTarget.classList.toggle('on')}></div></div>
            <div className="admin-row" style={{ borderBottom: 'none' }}><div style={{ fontSize: 12 }}>Recordatorio de citas</div><div className="switch on" onClick={(e) => e.currentTarget.classList.toggle('on')}></div></div>
          </div>
          <button type="button" className="btn btn-danger btn-auto" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}
