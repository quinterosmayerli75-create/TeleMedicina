import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useConsulta } from '../../hooks/useConsultas'
import { useRutas } from '@/shared/hooks/useRutas'
import { cancelarConsulta, ESTADOS_CONSULTA, MODALIDADES, subirComprobante } from '../../services/consultas'
import { LIMITE_FOTO_MB, mensajeErrorSubida, validarArchivo } from '@/services/archivos'
import { formatearFecha } from '@/shared/utils/fechas'
import { descargarComprobanteConsulta } from '../../utils/comprobantePdf'

export default function Consulta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const rutas = useRutas()
  const { usuario } = useAuth()
  const { consulta, cargando } = useConsulta(id)
  const [qr, setQr] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [cancelando, setCancelando] = useState(false)

  useEffect(() => {
    if (!consulta?.doctorId) return
    getDoc(doc(db, 'profesionales', consulta.doctorId)).then((snap) => setQr(snap.exists() ? snap.data() : {}))
  }, [consulta?.doctorId])

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!consulta || consulta.pacienteId !== usuario?.uid) {
    return (
      <div>
        <span className="back-link" onClick={() => navigate(rutas.base + '/consultas')}>← Volver</span>
        <p>No se encontró esa consulta.</p>
      </div>
    )
  }

  const estado = ESTADOS_CONSULTA[consulta.estado] ?? ESTADOS_CONSULTA.pendiente_pago
  const puedeSubirComprobante = consulta.estado === 'pendiente_pago' || consulta.estado === 'rechazada'

  async function alElegirComprobante(e) {
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
      await subirComprobante(consulta, archivo, setProgreso)
      setMensaje({ tipo: 'ok', texto: 'Comprobante enviado. Un administrador lo revisará pronto.' })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeErrorSubida(err) })
    } finally {
      setProgreso(null)
    }
  }

  async function cancelar() {
    setCancelando(true)
    try {
      await cancelarConsulta(consulta.id)
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate(rutas.base + '/consultas')}>← Volver a mis consultas</span>
      <h1 className="web-h1">Consulta con {consulta.doctor?.nombre ?? consulta.doctorNombre}</h1>
      <span className={`status-pill ${estado.clase}`}>{estado.etiqueta}</span>

      <div className="web-2col" style={{ maxWidth: 820, marginTop: 16 }}>
        <div>
          <div className="card-plain">
            <h2 className="section-title" style={{ marginTop: 0 }}>Detalle de la consulta</h2>
            <div className="ficha">
              <div><span>Modalidad</span>{MODALIDADES[consulta.modalidad]?.icono} {MODALIDADES[consulta.modalidad]?.etiqueta}</div>
              <div><span>Costo</span>Bs {consulta.costoConsulta}</div>
              {consulta.fecha && <div><span>Fecha y hora agendada</span>📅 {consulta.fecha} {consulta.hora}</div>}
              <div><span>Solicitada el</span>{formatearFecha(consulta.fechaSolicitud)}</div>
            </div>
            {(consulta.estado === 'habilitada' || consulta.estado === 'finalizada') && (
              <button type="button" className="btn btn-outline btn-auto" style={{ marginTop: 10 }} onClick={() => descargarComprobanteConsulta(consulta)}>
                📄 Descargar comprobante
              </button>
            )}
          </div>

          {consulta.estado === 'rechazada' && consulta.motivoRechazo && (
            <div className="registro-error" style={{ marginTop: 0 }}>El comprobante fue rechazado: {consulta.motivoRechazo}. Puedes subir otro.</div>
          )}

          {puedeSubirComprobante && (
            <div className="card-plain">
              <h2 className="section-title" style={{ marginTop: 0 }}>Pago por QR</h2>
              {qr?.qrPagoUrl ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={qr.qrPagoUrl} alt="QR de pago del doctor" style={{ width: 200, height: 200, objectFit: 'contain', border: '1px solid var(--marfil-osc)', borderRadius: 6 }} />
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>Este doctor todavía no configuró su QR de pago. Vuelve más tarde.</p>
              )}
              {qr?.datosPago && <p style={{ fontSize: 12.5, whiteSpace: 'pre-wrap', textAlign: 'center' }}>{qr.datosPago}</p>}

              <h2 className="section-title">Subir comprobante de pago</h2>
              <input type="file" accept="image/*" onChange={alElegirComprobante} disabled={progreso !== null} />
              <div className="selector-ayuda">Foto o captura del comprobante, máximo {LIMITE_FOTO_MB} MB.</div>
              {progreso !== null && <div style={{ fontSize: 12, marginTop: 8 }}>Subiendo… {Math.round(progreso * 100)}%</div>}
              {mensaje && (
                <div style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>{mensaje.texto}</div>
              )}

              {consulta.estado === 'pendiente_pago' && (
                <button type="button" className="btn btn-outline btn-auto" style={{ marginTop: 10 }} disabled={cancelando} onClick={cancelar}>
                  Cancelar solicitud
                </button>
              )}
            </div>
          )}

          {consulta.estado === 'pago_en_revision' && (
            <div className="card-plain">
              <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Tu comprobante está en revisión. Te avisaremos cuando el administrador lo valide.</p>
            </div>
          )}

          {consulta.estado === 'habilitada' && (
            <div className="card-plain">
              <p style={{ fontSize: 12.5, margin: 0 }}>✓ Pago aprobado. Ya puedes iniciar tu consulta.</p>
              <button type="button" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} onClick={() => navigate(rutas.mensajesDoctor(consulta.doctorId))}>
                Ir a la consulta
              </button>
            </div>
          )}

          {consulta.estado === 'finalizada' && (
            <div className="card-plain">
              <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Esta consulta ya finalizó.</p>
            </div>
          )}

          {consulta.estado === 'cancelada' && (
            <div className="card-plain">
              <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Esta solicitud fue cancelada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
