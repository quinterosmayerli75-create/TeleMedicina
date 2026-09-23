import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import CambiarFotoPerfil from '../../components/CambiarFotoPerfil'
import CambiarContrasena from '../../components/CambiarContrasena'
import GestionTitulos from '../../components/GestionTitulos'

export default function Configuracion() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [datos, setDatos] = useState({ edad: '', estatura: '', peso: '', telefono: '' })
  const [mensajeDatos, setMensajeDatos] = useState('')
  const [guardandoDatos, setGuardandoDatos] = useState(false)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        setDatos({ edad: d.edad ?? '', estatura: d.estatura ?? '', peso: d.peso ?? '', telefono: d.telefono ?? '' })
      }
    })
  }, [usuario])

  async function guardarDatos(e) {
    e.preventDefault()
    setMensajeDatos('')
    setGuardandoDatos(true)
    try {
      await updateDoc(doc(db, 'usuarios', usuario.uid), {
        edad: datos.edad ? Number(datos.edad) : null,
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
              <div><label className="campo-label" htmlFor="edad">Edad</label><input id="edad" type="number" min="0" value={datos.edad} onChange={(e) => setDatos({ ...datos, edad: e.target.value })} /></div>
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
