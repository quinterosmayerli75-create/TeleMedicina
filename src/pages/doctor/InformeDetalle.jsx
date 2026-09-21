import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useInforme } from '../../hooks/useInformes'
import { formatearFecha } from '../../utils/fechas'
import { CAMPOS_INFORME } from '../../utils/informes'
import { descargarInformePdf } from '../../utils/informesPdf'

export default function InformeDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { informe, cargando } = useInforme(id, usuario?.uid)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')

  async function descargar() {
    setDescargando(true)
    setError('')
    try {
      await descargarInformePdf(informe)
    } catch {
      setError('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!informe) {
    return (
      <div>
        <span className="back-link" onClick={() => navigate('/doctor/informes')}>← Volver</span>
        <p>No se encontró ese informe.</p>
      </div>
    )
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate('/doctor/informes')}>← Volver a informes</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div className="web-h1" style={{ marginBottom: 2 }}>Informe de {informe.pacienteNombre}</div>
          <div className="web-sub">Consulta del {formatearFecha(informe.fecha)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-auto" onClick={() => navigate(`/doctor/informes/${id}/editar`)}>Editar</button>
          <button type="button" className="btn btn-primary btn-auto" onClick={descargar} disabled={descargando}>{descargando ? 'Generando…' : 'Descargar PDF'}</button>
        </div>
      </div>
      {error && <div className="registro-error">{error}</div>}

      <div className="card-plain" style={{ maxWidth: 760 }}>
        <div className="ficha" style={{ marginBottom: 6 }}>
          <div><span>Paciente</span>{informe.pacienteNombre}{informe.pacienteEdad ? ` · ${informe.pacienteEdad} años` : ''}{informe.pacienteSexo ? ` · ${informe.pacienteSexo}` : ''}</div>
          <div><span>Profesional</span>{informe.doctorNombre}{informe.doctorEspecialidad ? ` · ${informe.doctorEspecialidad}` : ''}</div>
        </div>
        {CAMPOS_INFORME.map(({ clave, etiqueta }) =>
          informe[clave] || clave !== 'observaciones' ? (
            <div key={clave} style={{ marginTop: 16 }}>
              <div className="campo-label" style={{ marginTop: 0 }}>{etiqueta}</div>
              <p style={{ fontSize: 13.5, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{informe[clave] || '—'}</p>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}
