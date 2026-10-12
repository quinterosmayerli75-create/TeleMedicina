import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useConsulta } from '../../hooks/useConsultas'
import { ESTADOS_CONSULTA, finalizarConsulta, MODALIDADES } from '../../services/consultas'
import { formatearFecha } from '@/shared/utils/fechas'
import { descargarComprobanteConsulta } from '../../utils/comprobantePdf'
import { useInformesConsulta } from '@/features/informes/hooks/useInformes'

export default function ConsultaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { consulta, cargando } = useConsulta(id)
  const [guardando, setGuardando] = useState(false)
  const { informes } = useInformesConsulta(usuario?.uid, consulta?.pacienteId)

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!consulta || consulta.doctorId !== usuario?.uid) {
    return (
      <div>
        <span className="back-link" onClick={() => navigate('/doctor/consultas')}>← Volver</span>
        <p>No se encontró esa consulta.</p>
      </div>
    )
  }

  const estado = ESTADOS_CONSULTA[consulta.estado] ?? ESTADOS_CONSULTA.pendiente_pago

  async function finalizar() {
    setGuardando(true)
    try {
      await finalizarConsulta(consulta.id)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate('/doctor/consultas')}>← Volver a mis consultas</span>
      <h1 className="web-h1">Consulta con {consulta.paciente?.nombre ?? consulta.pacienteNombre}</h1>
      <span className={`status-pill ${estado.clase}`}>{estado.etiqueta}</span>

      <div className="card-plain" style={{ maxWidth: 520, marginTop: 16 }}>
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

        {consulta.estado === 'habilitada' && (
          <>
            <button type="button" className="btn btn-primary btn-auto" style={{ marginTop: 14 }} onClick={() => navigate(`/doctor/mensajes/${consulta.pacienteId}`)}>
              Ir a la consulta
            </button>
            <button type="button" className="btn btn-outline btn-auto" style={{ marginTop: 8 }} disabled={guardando} onClick={finalizar}>
              Marcar como finalizada
            </button>
          </>
        )}

        {consulta.estado === 'pago_en_revision' && (
          <p style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 14, marginBottom: 0 }}>El paciente subió su comprobante; el administrador lo está revisando.</p>
        )}
        {consulta.estado === 'pendiente_pago' && (
          <p style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 14, marginBottom: 0 }}>El paciente todavía no sube su comprobante de pago.</p>
        )}
      </div>

      {(consulta.estado === 'habilitada' || consulta.estado === 'finalizada') && (
        <div className="card-plain" style={{ maxWidth: 520, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Informe de esta consulta</h2>
            <button
              type="button"
              className="btn btn-outline btn-auto"
              onClick={() => navigate(`/doctor/informes/nuevo?paciente=${consulta.pacienteId}`)}
            >
              + Nuevo informe
            </button>
          </div>
          {informes.length === 0 ? (
            <p className="web-sub" style={{ marginBottom: 0 }}>Todavía no registraste cómo fue esta consulta ni qué se le recetó al paciente.</p>
          ) : (
            informes.map((informe) => (
              <div className="admin-row" key={informe.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/doctor/informes/${informe.id}`)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{formatearFecha(informe.fecha)}</div>
                  <div className="rank-meta"><b>Diagnóstico:</b> {informe.diagnostico}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
