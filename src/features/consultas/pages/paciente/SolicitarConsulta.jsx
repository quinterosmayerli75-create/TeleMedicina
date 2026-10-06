import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useProfesional } from '@/features/profesionales/hooks/useProfesionalesActivos'
import { crearConsulta, MODALIDADES } from '../../services/consultas'
import { hayHorarios, horasDisponibles } from '@/features/profesionales/utils/horarios'

const HOY = new Date().toISOString().slice(0, 10)

export default function SolicitarConsulta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario, perfil } = useAuth()
  const { profesional: doctor, cargando } = useProfesional(id)
  const [modalidad, setModalidad] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!doctor) {
    return (
      <div>
        <span className="back-link" onClick={() => navigate(-1)}>← Volver</span>
        <p>No se encontró ese profesional.</p>
      </div>
    )
  }

  const modalidadesActivas = Object.keys(MODALIDADES).filter((_, i) => doctor.modalidades?.[i])
  const tieneHorarios = hayHorarios(doctor.disponibilidad)
  const horas = horasDisponibles(doctor.disponibilidad, fecha)

  function elegirFecha(valor) {
    setFecha(valor)
    setHora('')
  }

  async function confirmar() {
    if (!modalidad) {
      setError('Elige la modalidad de atención.')
      return
    }
    if (!fecha || !hora) {
      setError('Elige la fecha y la hora de la consulta.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      const idConsulta = await crearConsulta({
        pacienteId: usuario.uid,
        pacienteNombre: perfil?.nombre ?? '',
        doctorId: doctor.id,
        doctorNombre: doctor.nombre,
        modalidad,
        costoConsulta: doctor.costoConsulta,
        fecha,
        hora,
      })
      navigate(`/paciente/consultas/${idConsulta}`, { replace: true })
    } catch {
      setError('No se pudo crear la solicitud. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate(-1)}>← Volver</span>
      <h1 className="web-h1">Solicitar consulta</h1>
      <p className="web-sub">Con {doctor.nombre} · {doctor.profesion}</p>

      <div className="card-plain" style={{ maxWidth: 520 }}>
        <div className="ficha" style={{ marginBottom: 16 }}>
          <div><span>Costo de la consulta</span><b>Bs {doctor.costoConsulta}</b></div>
        </div>

        <h2 className="section-title" style={{ marginTop: 0 }}>Elige la modalidad</h2>
        {modalidadesActivas.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>Este profesional no configuró ninguna modalidad de atención todavía.</p>
        )}
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {modalidadesActivas.map((clave) => (
            <label key={clave} className="card-plain" style={{ margin: 0, padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: modalidad === clave ? '2px solid var(--esmeralda)' : undefined }}>
              <input type="radio" name="modalidad" value={clave} checked={modalidad === clave} onChange={() => setModalidad(clave)} />
              <span>{MODALIDADES[clave].icono} {MODALIDADES[clave].etiqueta}</span>
            </label>
          ))}
        </div>

        <h2 className="section-title">Elige fecha y hora</h2>

        {!tieneHorarios ? (
          <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>
            Este profesional todavía no configuró sus horarios de atención, así que por ahora no se le pueden agendar consultas. Vuelve a intentarlo más tarde.
          </p>
        ) : (
          <>
            <label className="campo-label" htmlFor="fecha">Fecha</label>
            <input id="fecha" type="date" min={HOY} value={fecha} onChange={(e) => elegirFecha(e.target.value)} style={{ marginBottom: 12 }} />

            {fecha && horas.length === 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>Este profesional no atiende ese día. Elige otra fecha.</p>
            )}
            {horas.length > 0 && (
              <div className="chip-row" style={{ marginBottom: 16 }}>
                {horas.map((h) => (
                  <div key={h} className={`chip${hora === h ? ' on' : ''}`} onClick={() => setHora(h)}>{h}</div>
                ))}
              </div>
            )}
          </>
        )}

        {error && <div className="registro-error" style={{ marginTop: 0 }}>{error}</div>}
        <button type="button" className="btn btn-primary btn-auto" disabled={enviando || modalidadesActivas.length === 0 || !tieneHorarios} onClick={confirmar}>
          {enviando ? 'Enviando…' : 'Continuar al pago'}
        </button>
      </div>
    </div>
  )
}
