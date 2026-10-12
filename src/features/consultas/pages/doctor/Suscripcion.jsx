import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useSuscripcionesDoctor } from '../../hooks/useSuscripciones'
import { ESTADOS_SUSCRIPCION, PLANES, solicitarSuscripcion, subirComprobanteSuscripcion } from '../../services/suscripciones'
import { LIMITE_FOTO_MB, mensajeErrorSubida, validarArchivo } from '@/services/archivos'
import { formatearFecha } from '@/shared/utils/fechas'

export default function Suscripcion() {
  const { usuario, perfil } = useAuth()
  const { suscripciones, cargando } = useSuscripcionesDoctor(usuario?.uid)
  const [datosProfesional, setDatosProfesional] = useState(null)
  const [configPago, setConfigPago] = useState(null)
  const [plan, setPlan] = useState('mensual')
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'profesionales', usuario.uid)).then((snap) => setDatosProfesional(snap.exists() ? snap.data() : {}))
    getDoc(doc(db, 'config', 'pagos')).then((snap) => setConfigPago(snap.exists() ? snap.data() : {}))
  }, [usuario])

  if (cargando || !datosProfesional || !configPago) return <p className="web-sub">Cargando…</p>

  // La más reciente que todavía está en curso (esperando pago o revisión) o fue rechazada.
  const enCurso = suscripciones.find((s) => ['pendiente_pago', 'pago_en_revision', 'rechazada'].includes(s.estado))
  const activa = datosProfesional.suscripcionActiva && datosProfesional.suscripcionVenceEl >= new Date().toISOString().slice(0, 10)

  async function solicitar() {
    setMensaje(null)
    setEnviando(true)
    try {
      const precio = plan === 'anual' ? configPago.precioAnual : configPago.precioMensual
      await solicitarSuscripcion({ doctorId: usuario.uid, doctorNombre: perfil?.nombre ?? '', plan, precio: Number(precio) || 0 })
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo crear la solicitud. Intenta de nuevo.' })
    } finally {
      setEnviando(false)
    }
  }

  async function alElegirComprobante(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || !enCurso) return

    const problema = validarArchivo(archivo, { solo: 'imagen', maxMB: LIMITE_FOTO_MB })
    if (problema) {
      setMensaje({ tipo: 'error', texto: problema })
      return
    }

    setMensaje(null)
    setProgreso(0)
    try {
      await subirComprobanteSuscripcion(enCurso, archivo, setProgreso)
      setMensaje({ tipo: 'ok', texto: 'Comprobante enviado. El administrador lo revisará pronto.' })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeErrorSubida(err) })
    } finally {
      setProgreso(null)
    }
  }

  return (
    <div>
      <h1 className="web-h1">Suscripción a DocTop</h1>
      <p className="web-sub">Para aparecer en las búsquedas y recibir consultas, tu suscripción debe estar activa.</p>

      <div className="card-plain" style={{ maxWidth: 520 }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>Estado actual</h2>
        {activa ? (
          <p style={{ fontSize: 13 }}>
            ✓ Activa hasta el <b>{datosProfesional.suscripcionVenceEl}</b> ({PLANES[datosProfesional.suscripcionPlan]?.etiqueta ?? '—'}).
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--alerta)' }}>
            Tu suscripción no está activa. No apareces en las búsquedas de pacientes hasta que la pagues y sea aprobada.
          </p>
        )}
      </div>

      {!enCurso && (
        <div className="card-plain" style={{ maxWidth: 520 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>{activa ? 'Renovar' : 'Pagar suscripción'}</h2>
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            {Object.entries(PLANES).map(([clave, info]) => (
              <label key={clave} className="card-plain" style={{ margin: 0, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: plan === clave ? '2px solid var(--esmeralda)' : undefined }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="radio" name="plan" value={clave} checked={plan === clave} onChange={() => setPlan(clave)} />
                  {info.etiqueta}
                </span>
                <b>Bs {clave === 'anual' ? configPago.precioAnual ?? '—' : configPago.precioMensual ?? '—'}</b>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-auto" disabled={enviando} onClick={solicitar}>
            {enviando ? 'Enviando…' : 'Solicitar'}
          </button>
        </div>
      )}

      {enCurso && (
        <div className="card-plain" style={{ maxWidth: 520 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            {PLANES[enCurso.plan]?.etiqueta} · Bs {enCurso.precio} <span className={`status-pill ${ESTADOS_SUSCRIPCION[enCurso.estado]?.clase}`} style={{ marginLeft: 8 }}>{ESTADOS_SUSCRIPCION[enCurso.estado]?.etiqueta}</span>
          </h2>

          {enCurso.estado === 'rechazada' && enCurso.motivoRechazo && (
            <div className="registro-error" style={{ marginTop: 0 }}>Rechazado: {enCurso.motivoRechazo}. Puedes subir otro comprobante.</div>
          )}

          {(enCurso.estado === 'pendiente_pago' || enCurso.estado === 'rechazada') && (
            <>
              {configPago.qrUrl ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={configPago.qrUrl} alt="QR de suscripción" style={{ width: 200, height: 200, objectFit: 'contain', border: '1px solid var(--marfil-osc)', borderRadius: 6 }} />
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>El administrador todavía no configuró el QR de suscripción.</p>
              )}
              {configPago.datosPago && <p style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', textAlign: 'center' }}>{configPago.datosPago}</p>}

              <h2 className="section-title">Subir comprobante de pago</h2>
              <input type="file" accept="image/*" onChange={alElegirComprobante} disabled={progreso !== null} />
              <div className="selector-ayuda">Foto o captura del comprobante, máximo {LIMITE_FOTO_MB} MB.</div>
              {progreso !== null && <div style={{ fontSize: 12, marginTop: 8 }}>Subiendo… {Math.round(progreso * 100)}%</div>}
            </>
          )}

          {enCurso.estado === 'pago_en_revision' && (
            <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Tu comprobante está en revisión. Te avisaremos cuando el administrador lo valide.</p>
          )}

          {mensaje && (
            <div style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>{mensaje.texto}</div>
          )}
        </div>
      )}

      {suscripciones.length > 0 && (
        <div className="card-plain" style={{ maxWidth: 520 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Historial</h2>
          {suscripciones.map((s) => (
            <div className="admin-row" key={s.id}>
              <div>
                {PLANES[s.plan]?.etiqueta} · Bs {s.precio}
                <div className="rank-meta">{formatearFecha(s.fechaSolicitud)}</div>
              </div>
              <span className={`status-pill ${ESTADOS_SUSCRIPCION[s.estado]?.clase}`}>{ESTADOS_SUSCRIPCION[s.estado]?.etiqueta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
