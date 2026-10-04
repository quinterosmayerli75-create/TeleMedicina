import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import CambiarFotoPerfil from '../../components/CambiarFotoPerfil'
import CambiarContrasena from '../../components/CambiarContrasena'
import GestionTitulos from '../../components/GestionTitulos'
import { calcularEdad } from '../../utils/fechas'

const HOY = new Date().toISOString().slice(0, 10)

export default function Configuracion() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [datos, setDatos] = useState({ fechaNacimiento: '', estatura: '', peso: '', telefono: '' })
  const [mensajeDatos, setMensajeDatos] = useState('')
  const [guardandoDatos, setGuardandoDatos] = useState(false)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setDatos({ fechaNacimiento: d.fechaNacimiento ?? '', estatura: d.estatura ?? '', peso: d.peso ?? '', telefono: d.telefono ?? '' })
      }
    })
  }, [usuario])

  async function guardarDatos(e) {
    e.preventDefault()
    setMensajeDatos('')
    if (datos.fechaNacimiento && datos.fechaNacimiento > HOY) {
      setMensajeDatos('La fecha de nacimiento no puede ser futura.')
      return
    }
    setGuardandoDatos(true)
    try {
      await updateDoc(doc(db, 'usuarios', usuario.uid), {
        fechaNacimiento: datos.fechaNacimiento || null,
        edad: datos.fechaNacimiento ? calcularEdad(datos.fechaNacimiento) : null,
        estatura: datos.estatura,
        peso: datos.peso,
        telefono: datos.telefono,
      })
      setMensajeDatos('Datos actualizados.')
    } catch {
      setMensajeDatos('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setGuardandoDatos(false)
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
          <div className="card-plain">
            <h2 className="section-title">Foto de perfil</h2>
            <CambiarFotoPerfil />
          </div>

          <CambiarContrasena />

          <form className="card-plain" onSubmit={guardarDatos}>
            <h2 className="section-title">Mis datos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="campo-label" htmlFor="fechaNacimiento">Fecha de nacimiento</label>
                <input id="fechaNacimiento" type="date" max={HOY} value={datos.fechaNacimiento} onChange={(e) => setDatos({ ...datos, fechaNacimiento: e.target.value })} />
                {datos.fechaNacimiento && <div style={{ fontSize: 11, color: 'var(--gris)', marginTop: 4 }}>Edad: {calcularEdad(datos.fechaNacimiento)} años</div>}
              </div>
              <div><label className="campo-label" htmlFor="estatura">Estatura aprox.</label><input id="estatura" type="text" value={datos.estatura} onChange={(e) => setDatos({ ...datos, estatura: e.target.value })} /></div>
              <div><label className="campo-label" htmlFor="peso">Peso aprox.</label><input id="peso" type="text" value={datos.peso} onChange={(e) => setDatos({ ...datos, peso: e.target.value })} /></div>
              <div><label className="campo-label" htmlFor="telefono">Celular (8 dígitos)</label><input id="telefono" type="text" inputMode="numeric" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value.replace(/\D/g, '').slice(0, 8) })} /></div>
            </div>
            {mensajeDatos && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--esmeralda)' }}>{mensajeDatos}</div>}
            <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardandoDatos}>Guardar</button>
          </form>
        </div>

        <div>
          <GestionTitulos />
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
