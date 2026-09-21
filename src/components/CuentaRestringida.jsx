import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { esBloqueo } from '../utils/bloqueos'
import { aFecha, diasRestantes, formatearFecha } from '../utils/fechas'

// Pantalla que reemplaza al panel cuando la cuenta no está activa: en revisión, rechazada o bloqueada.
// Si está bloqueada, la persona ve el motivo y hasta cuándo, y puede enviar una apelación que el admin
// resuelve desde Denuncias → Apelaciones.

function useMisApelaciones(uid) {
  const [apelaciones, setApelaciones] = useState([])
  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      query(collection(db, 'apelaciones'), where('usuarioId', '==', uid)),
      (snap) => {
        const filas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        filas.sort((a, b) => (aFecha(b.fecha)?.getTime() ?? 0) - (aFecha(a.fecha)?.getTime() ?? 0))
        setApelaciones(filas)
      },
      () => setApelaciones([])
    )
  }, [uid])
  return apelaciones
}

function Apelacion({ usuario, perfil }) {
  const apelaciones = useMisApelaciones(usuario.uid)
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const pendiente = apelaciones.find((a) => a.estado === 'pendiente')
  const ultimaRechazada = apelaciones.find((a) => a.estado === 'rechazada')

  async function enviar(e) {
    e.preventDefault()
    setError('')
    if (!mensaje.trim()) {
      setError('Cuéntanos por qué crees que el bloqueo es un error.')
      return
    }
    setEnviando(true)
    try {
      await addDoc(collection(db, 'apelaciones'), {
        usuarioId: usuario.uid,
        mensaje: mensaje.trim(),
        estado: 'pendiente',
        fecha: serverTimestamp(),
        bloqueo: perfil.estado,
      })
      setMensaje('')
    } catch {
      setError('No se pudo enviar la apelación. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (pendiente) {
    return (
      <div className="registro-aviso" style={{ marginTop: 16, textAlign: 'left' }} data-testid="apelacion-pendiente">
        <strong>Tu apelación está en revisión.</strong> Te avisaremos cuando el equipo de DocTop responda.
        <p style={{ margin: '8px 0 0', color: 'var(--gris)' }}>Enviada el {formatearFecha(pendiente.fecha)}: “{pendiente.mensaje}”</p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} style={{ marginTop: 16, textAlign: 'left' }}>
      {ultimaRechazada && (
        <div className="registro-error" style={{ marginTop: 0, marginBottom: 12 }}>
          Tu última apelación fue rechazada{ultimaRechazada.notaAdmin ? `: ${ultimaRechazada.notaAdmin}` : '.'} Puedes enviar otra con nueva información.
        </div>
      )}
      <label className="campo-label" htmlFor="apelacion-mensaje">¿Crees que es un error? Envía una apelación</label>
      <textarea
        id="apelacion-mensaje"
        rows="3"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Explica lo sucedido…"
        disabled={enviando}
      />
      {error && <div className="registro-error">{error}</div>}
      <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar apelación'}
      </button>
    </form>
  )
}

export default function CuentaRestringida() {
  const navigate = useNavigate()
  const { usuario, perfil, estado } = useAuth()
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const rechazada = estado === 'rechazado_temporal' || estado === 'rechazado_definitivo'
  useEffect(() => {
    if (!rechazada || !usuario) return
    getDoc(doc(db, 'profesionales', usuario.uid))
      .then((snap) => setMotivoRechazo(snap.exists() ? (snap.data().motivoRechazo ?? '') : ''))
      .catch(() => {})
  }, [rechazada, usuario])

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  let titulo = 'Tu cuenta no está activa'
  let cuerpo = <p className="web-sub">Por ahora no puedes usar DocTop con esta cuenta. Si crees que es un error, comunícate con el equipo de DocTop.</p>

  if (estado === 'pendiente') {
    titulo = 'Cuenta en revisión'
    cuerpo = (
      <p className="web-sub">
        Tu solicitud está siendo verificada por el equipo de DocTop. Te avisaremos por correo o WhatsApp
        en cuanto tu cuenta esté activa.
      </p>
    )
  } else if (rechazada) {
    titulo = estado === 'rechazado_temporal' ? 'Solicitud rechazada por ahora' : 'Solicitud rechazada'
    cuerpo = (
      <p className="web-sub">
        {estado === 'rechazado_temporal'
          ? 'El equipo de DocTop encontró algo que corregir en tu solicitud.'
          : 'El equipo de DocTop no pudo aprobar tu solicitud de registro.'}
        {motivoRechazo && <><br /><strong>Motivo:</strong> {motivoRechazo}</>}
      </p>
    )
  } else if (esBloqueo(estado)) {
    const temporal = estado === 'bloqueado_temporal'
    const dias = diasRestantes(perfil?.bloqueadoHasta)
    titulo = temporal ? 'Cuenta bloqueada temporalmente' : 'Cuenta bloqueada'
    cuerpo = (
      <>
        <p className="web-sub" data-testid="bloqueo-detalle">
          {temporal
            ? `Tu cuenta está bloqueada hasta el ${formatearFecha(perfil?.bloqueadoHasta)}${dias > 0 ? ` (faltan ${dias} día${dias === 1 ? '' : 's'})` : ''}. Después se reactiva sola.`
            : 'Tu cuenta fue bloqueada de forma permanente por el equipo de DocTop.'}
          {perfil?.motivoBloqueo && <><br /><strong>Motivo:</strong> {perfil.motivoBloqueo}</>}
        </p>
        {usuario && perfil && <Apelacion usuario={usuario} perfil={perfil} />}
      </>
    )
  }

  return (
    <div className="web-auth">
      <div className="web-auth-card" style={{ textAlign: 'center' }} data-testid="cuenta-restringida">
        <div className="modal-titulo" style={esBloqueo(estado) ? { color: 'var(--alerta)' } : undefined}>{titulo}</div>
        {cuerpo}
        <button type="button" className="btn btn-outline" style={{ marginTop: 16 }} onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
    </div>
  )
}
