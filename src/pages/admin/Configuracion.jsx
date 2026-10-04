import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import CambiarContrasena from '../../components/CambiarContrasena'
import { LIMITE_FOTO_MB, mensajeErrorSubida, subirArchivo, validarArchivo } from '../../utils/archivos'

function ConfigPagos() {
  const [datos, setDatos] = useState({ qrUrl: '', datosPago: '' })
  const [cargando, setCargando] = useState(true)
  const [progreso, setProgreso] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'config', 'pagos'))
      .then((snap) => { if (snap.exists()) setDatos({ qrUrl: snap.data().qrUrl ?? '', datosPago: snap.data().datosPago ?? '' }) })
      .finally(() => setCargando(false))
  }, [])

  async function alElegirQr(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    const problema = validarArchivo(archivo, { solo: 'imagen', maxMB: LIMITE_FOTO_MB })
    if (problema) {
      setMensaje({ tipo: 'error', texto: problema })
      return
    }

    setMensaje(null)
    setProgreso(0)
    try {
      const { url } = await subirArchivo(`config/pagos/qr-${Date.now()}`, archivo, setProgreso)
      await setDoc(doc(db, 'config', 'pagos'), { qrUrl: url, datosPago: datos.datosPago }, { merge: true })
      setDatos((d) => ({ ...d, qrUrl: url }))
      setMensaje({ tipo: 'ok', texto: 'QR actualizado.' })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeErrorSubida(err) })
    } finally {
      setProgreso(null)
    }
  }

  async function guardarTexto(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      await setDoc(doc(db, 'config', 'pagos'), { qrUrl: datos.qrUrl, datosPago: datos.datosPago }, { merge: true })
      setMensaje({ tipo: 'ok', texto: 'Datos de pago guardados.' })
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar. Intenta de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return null

  return (
    <form className="card-plain" onSubmit={guardarTexto}>
      <h2 className="section-title" style={{ marginTop: 0 }}>QR de pago</h2>
      <p style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 0 }}>Este QR y los datos de pago se muestran a los pacientes cuando solicitan una consulta.</p>
      {datos.qrUrl && (
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <img src={datos.qrUrl} alt="QR de pago actual" style={{ width: 160, height: 160, objectFit: 'contain', border: '1px solid var(--marfil-osc)', borderRadius: 6 }} />
        </div>
      )}
      <input type="file" accept="image/*" onChange={alElegirQr} disabled={progreso !== null} />
      {progreso !== null && <div style={{ fontSize: 12, marginTop: 8 }}>Subiendo… {Math.round(progreso * 100)}%</div>}

      <label className="campo-label" htmlFor="datosPago" style={{ marginTop: 12, display: 'block' }}>Datos de pago (texto que ve el paciente)</label>
      <textarea id="datosPago" rows="3" value={datos.datosPago} onChange={(e) => setDatos({ ...datos, datosPago: e.target.value })} placeholder="Ej. Cuenta Banco Unión, titular DocTop SRL…" />

      {mensaje && <div style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>{mensaje.texto}</div>}
      <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardando}>Guardar datos de pago</button>
    </form>
  )
}

export default function Configuracion() {
  const navigate = useNavigate()

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div>
      <h1 className="web-h1">Mi cuenta</h1>
      <div className="web-2col" style={{ maxWidth: 820 }}>
        <CambiarContrasena mostrarCorreo textoBoton="Guardar cambios" />

        <div>
          <ConfigPagos />
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
